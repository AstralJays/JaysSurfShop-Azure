resource "null_resource" "order_webhook_package" {
  triggers = {
    handler = filemd5("${path.module}/../../function/order-webhook/handler.py")
    app     = filemd5("${path.module}/../../function/order-webhook/function_app.py")
    reqs    = filemd5("${path.module}/../../function/order-webhook/requirements.txt")
  }

  provisioner "local-exec" {
    command     = "chmod +x ${path.module}/../../function/order-webhook/build.sh && ${path.module}/../../function/order-webhook/build.sh"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "order_webhook" {
  depends_on  = [null_resource.order_webhook_package]
  type        = "zip"
  source_dir  = "${path.module}/../../function/order-webhook/package"
  output_path = "${path.module}/../../function/order-webhook/build.zip"
}

resource "azurerm_service_plan" "order_webhook" {
  name                = "${local.name_prefix}-func-plan"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  # EP1 (Elastic Premium) — required for Kudu/SCM so Upwind can upload the runtime tracer.
  # Linux Consumption (Y1) has no SCM VFS; upwindctl instrument-appservice fails with 404.
  sku_name     = "EP1"
  worker_count = 1
  tags         = local.common_tags
}

resource "azurerm_user_assigned_identity" "order_webhook" {
  name                = "${local.name_prefix}-order-webhook"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = merge(local.common_tags, { DemoFinding = "function-overprivileged-identity" })
}

# CSPM workshop finding: overprivileged function managed identity
resource "azurerm_role_assignment" "order_webhook_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.order_webhook.principal_id
}

resource "azurerm_linux_function_app" "order_webhook" {
  name                       = "${local.name_prefix}-order-webhook"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  service_plan_id            = azurerm_service_plan.order_webhook.id
  storage_account_name       = azurerm_storage_account.function.name
  storage_account_access_key = azurerm_storage_account.function.primary_access_key
  https_only                 = false

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.order_webhook.id]
  }

  site_config {
    elastic_instance_minimum    = 1
    pre_warmed_instance_count   = 1
    application_stack {
      python_version = "3.12"
    }
    cors {
      allowed_origins = ["*"]
    }
  }

  app_settings = merge(
    {
      ENVIRONMENT                    = var.environment
      FUNCTIONS_WORKER_RUNTIME       = "python"
      AzureWebJobsFeatureFlags       = "EnableWorkerIndexing"
      WEBSITE_RUN_FROM_PACKAGE       = "https://${azurerm_storage_account.function.name}.blob.core.windows.net/function-packages/order-webhook.zip${data.azurerm_storage_account_sas.function_package.sas}"
      SCM_DO_BUILD_DURING_DEPLOYMENT = "false"
    },
    var.upwind_function_client_id != "" ? {
      BASH_ENV                              = "/home/upwind-startup.sh"
      UPWIND_TRACER_REPORT_TO_BACKEND       = "true"
      UPWIND_TRACER_AUTH_ENDPOINT           = "https://oauth.upwind.io/oauth/token"
      UPWIND_TRACER_BACKEND_API_HOST        = "https://agent.upwind.io"
      UPWIND_TRACER_REGISTRATION_HOST       = "https://agent.upwind.io"
      UPWIND_TRACER_AUTH_CLIENT_ID          = var.upwind_function_client_id
      UPWIND_TRACER_AUTH_CLIENT_SECRET      = var.upwind_function_client_secret
      UPWIND_TRACER_INSTANCE_TYPE           = "AppService"
      UPWIND_CLOUD_PROVIDER                 = "azure"
      UPWIND_CLOUD_ACCOUNT_ID               = data.azurerm_client_config.current.subscription_id
      UPWIND_REGION                         = var.upwind_function_region
      UPWIND_TRACER_EXTENDED_SYSCALLS       = "true"
      UPWIND_TRACER_REPORT_API_CATALOG      = "true"
    } : {}
  )

  tags = merge(local.common_tags, {
    DemoFinding = "eicar-and-cve-package"
    CSPMCheck   = "serverless-vulnerable-deps"
  })

  depends_on = [
    azurerm_storage_blob.order_webhook_package,
    azurerm_role_assignment.order_webhook_contributor,
  ]
}

data "azurerm_storage_account_sas" "function_package" {
  connection_string = azurerm_storage_account.function.primary_connection_string
  https_only        = true
  start             = timeadd(timestamp(), "-5m")
  expiry            = timeadd(timestamp(), "8760h")

  resource_types {
    service   = true
    container = true
    object    = true
  }

  services {
    blob  = true
    queue = false
    table = false
    file  = false
  }

  permissions {
    read = true
  }
}

resource "azurerm_storage_container" "function_packages" {
  name                  = "function-packages"
  storage_account_id    = azurerm_storage_account.function.id
  container_access_type = "private"
}

resource "azurerm_storage_blob" "order_webhook_package" {
  depends_on             = [null_resource.order_webhook_package]
  name                   = "order-webhook.zip"
  storage_account_name   = azurerm_storage_account.function.name
  storage_container_name = azurerm_storage_container.function_packages.name
  type                   = "Block"
  source                 = data.archive_file.order_webhook.output_path
  content_md5            = data.archive_file.order_webhook.output_md5
}
