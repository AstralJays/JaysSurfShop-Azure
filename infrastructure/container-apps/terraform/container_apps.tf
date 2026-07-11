resource "azurerm_user_assigned_identity" "apps" {
  name                = "${local.name_prefix}-aca-apps"
  location            = module.workshop.location
  resource_group_name = module.workshop.resource_group_name
}

resource "azurerm_role_assignment" "apps_acr_pull" {
  scope                = module.workshop.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.apps.principal_id
}

resource "azurerm_role_assignment" "apps_storage_contributor" {
  scope                = module.workshop.board_images_storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.apps.principal_id
}

# CSPM workshop finding: overprivileged Container Apps identity
resource "azurerm_role_assignment" "apps_demo_overprivileged" {
  scope                = "/subscriptions/${module.workshop.subscription_id}"
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.apps.principal_id
}

resource "azurerm_container_app_environment" "main" {
  name                       = "${local.name_prefix}-aca-env"
  location                   = module.workshop.location
  resource_group_name        = module.workshop.resource_group_name
  log_analytics_workspace_id = module.workshop.log_analytics_workspace_id
  infrastructure_subnet_id   = module.workshop.container_apps_subnet_id

  tags = {
    Name = "${local.name_prefix}-aca-env"
  }
}

locals {
  aca_domain = azurerm_container_app_environment.main.default_domain

  internal_service_urls = {
    chat-rag        = "https://chat-rag.internal.${local.aca_domain}"
    board-generator = "https://board-generator.internal.${local.aca_domain}"
  }

  service_env = {
    frontend = [
      { name = "SERVICE_NAME", value = "frontend" },
      { name = "ENVIRONMENT", value = var.environment },
      { name = "AZURE_REGION", value = var.location },
      { name = "DEPLOYMENT_ID", value = local.name_prefix },
      { name = "LOG_FORMAT", value = "json" },
      { name = "CHAT_SERVICE_URL", value = local.internal_service_urls.chat-rag },
      { name = "BOARD_SERVICE_URL", value = local.internal_service_urls.board-generator },
      { name = "ORDER_WEBHOOK_URL", value = module.workshop.order_webhook_url },
      { name = "NEXT_PUBLIC_APP_ENV", value = var.environment },
    ]
    chat-rag = [
      { name = "SERVICE_NAME", value = "chat-rag" },
      { name = "ENVIRONMENT", value = var.environment },
      { name = "AZURE_REGION", value = var.location },
      { name = "AZURE_SUBSCRIPTION_ID", value = module.workshop.subscription_id },
      { name = "AZURE_TENANT_ID", value = module.workshop.tenant_id },
      { name = "AZURE_CLIENT_ID", value = azurerm_user_assigned_identity.apps.client_id },
      { name = "AZURE_KEY_VAULT_URI", value = module.workshop.key_vault_uri },
      { name = "DEPLOYMENT_ID", value = local.name_prefix },
      { name = "LOG_FORMAT", value = "json" },
      { name = "AI_MODEL_CHAT", value = "gpt-4o-mini" },
      { name = "AI_MODEL_EMBED", value = "text-embedding-3-small" },
      { name = "LEAKED_SP_PATH", value = "/var/run/demo/leaked-sp.json" },
      { name = "WORKSHOP_DEV_SP_CLIENT_ID", value = module.workshop.workshop_dev_sp_client_id },
      { name = "WORKSHOP_DEV_SP_OBJECT_ID", value = module.workshop.workshop_dev_sp_object_id },
      { name = "WORKSHOP_RESOURCE_GROUP", value = module.workshop.resource_group_name },
      { name = "WORKSHOP_STORAGE_ACCOUNT", value = module.workshop.board_images_storage_account },
      { name = "WORKSHOP_PUBLIC_BLOB_URL", value = module.workshop.demo_public_blob_url },
    ]
    board-generator = [
      { name = "SERVICE_NAME", value = "board-generator" },
      { name = "ENVIRONMENT", value = var.environment },
      { name = "AZURE_REGION", value = var.location },
      { name = "DEPLOYMENT_ID", value = local.name_prefix },
      { name = "LOG_FORMAT", value = "json" },
      { name = "AZURE_STORAGE_ACCOUNT", value = module.workshop.board_images_storage_account },
      { name = "AZURE_STORAGE_CONTAINER", value = module.workshop.board_images_container },
      { name = "AI_MODEL", value = "gpt-image-1" },
    ]
  }
}

resource "azurerm_container_app" "services" {
  for_each = local.services

  name                         = each.key
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = module.workshop.resource_group_name
  revision_mode                = "Single"

  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  registry {
    server   = module.workshop.acr_login_server
    identity = azurerm_user_assigned_identity.apps.id
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }

  secret {
    name  = "leaked-sp-json"
    value = module.workshop.leaked_sp_credentials_json
  }

  dynamic "secret" {
    for_each = local.upwind_enabled ? [1] : []
    content {
      name  = "upwind-client-id"
      value = var.upwind_client_id
    }
  }

  dynamic "secret" {
    for_each = local.upwind_enabled ? [1] : []
    content {
      name  = "upwind-client-secret"
      value = var.upwind_client_secret
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    dynamic "volume" {
      for_each = local.upwind_enabled ? [1] : []
      content {
        name         = "upwind-tracer-shared"
        storage_type = "EmptyDir"
      }
    }

    dynamic "init_container" {
      for_each = local.upwind_enabled ? [1] : []
      content {
        name    = "upwind-tracer-init"
        image   = var.upwind_tracer_image
        cpu     = 0.25
        memory  = "0.5Gi"
        command = ["/var/lib/upwind/upwind-tracer", "--self-copy-path", "/shared/upwind-tracer"]

        volume_mounts {
          name = "upwind-tracer-shared"
          path = "/shared"
        }
      }
    }

    container {
      name    = each.key
      image   = "${module.workshop.acr_repository_urls[each.key]}:${var.image_tag}"
      command = local.upwind_enabled ? concat(["/shared/upwind-tracer", "--"], each.value.command) : each.value.command
      cpu     = each.value.cpu
      memory  = each.value.memory

      dynamic "volume_mounts" {
        for_each = local.upwind_enabled ? [1] : []
        content {
          name = "upwind-tracer-shared"
          path = "/shared"
        }
      }

      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }

      dynamic "env" {
        for_each = local.service_env[each.key]
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      dynamic "env" {
        for_each = each.key == "chat-rag" ? [1] : []
        content {
          name        = "LEAKED_SP_JSON"
          secret_name = "leaked-sp-json"
        }
      }

      dynamic "env" {
        for_each = local.upwind_enabled ? [1] : []
        content {
          name        = "UPWIND_TRACER_AUTH_CLIENT_ID"
          secret_name = "upwind-client-id"
        }
      }

      dynamic "env" {
        for_each = local.upwind_enabled ? [1] : []
        content {
          name        = "UPWIND_TRACER_AUTH_CLIENT_SECRET"
          secret_name = "upwind-client-secret"
        }
      }

      dynamic "env" {
        for_each = local.upwind_env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }
    }
  }

  dynamic "ingress" {
    for_each = [1]
    content {
      external_enabled = each.value.public
      target_port      = each.value.port
      transport        = "auto"
      allow_insecure_connections = false

      traffic_weight {
        percentage      = 100
        latest_revision = true
      }
    }
  }

  depends_on = [
    azurerm_role_assignment.apps_acr_pull,
    azurerm_role_assignment.apps_storage_contributor,
  ]
}
