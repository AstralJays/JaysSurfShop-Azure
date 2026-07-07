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
      { name = "DEPLOYMENT_ID", value = local.name_prefix },
      { name = "LOG_FORMAT", value = "json" },
      { name = "AI_MODEL_CHAT", value = "gpt-4o-mini" },
      { name = "AI_MODEL_EMBED", value = "text-embedding-3-small" },
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
    type         = "UserAssigned"
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

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name    = each.key
      image   = "${module.workshop.acr_repository_urls[each.key]}:${var.image_tag}"
      command = each.value.command
      cpu     = each.value.cpu
      memory  = each.value.memory

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
