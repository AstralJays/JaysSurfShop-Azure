output "name_prefix" {
  value = local.name_prefix
}

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "location" {
  value = azurerm_resource_group.main.location
}

output "vnet_id" {
  value = azurerm_virtual_network.main.id
}

output "private_subnet_id" {
  value = azurerm_subnet.private.id
}

output "aks_subnet_id" {
  value = azurerm_subnet.aks.id
}

output "container_apps_subnet_id" {
  value = azurerm_subnet.container_apps.id
}

output "workload_nsg_id" {
  value = azurerm_network_security_group.workload.id
}

output "acr_login_server" {
  value = azurerm_container_registry.main.login_server
}

output "acr_name" {
  value = azurerm_container_registry.main.name
}

output "acr_repository_urls" {
  value = {
    for name, svc in local.services :
    name => "${local.acr_login_server}/${local.name_prefix}/${svc.image}"
  }
}

output "key_vault_id" {
  value = azurerm_key_vault.main.id
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "openai_secret_name" {
  value = azurerm_key_vault_secret.openai_api_key.name
}

output "board_images_storage_account" {
  value = azurerm_storage_account.board_images.name
}

output "board_images_container" {
  value = azurerm_storage_container.board_images.name
}

output "demo_public_blob_url" {
  value = "https://${azurerm_storage_account.demo_public.name}.blob.core.windows.net/${azurerm_storage_container.demo_public.name}/${azurerm_storage_blob.demo_customer_export.name}"
}

output "order_webhook_url" {
  value = "https://${azurerm_linux_function_app.order_webhook.default_hostname}"
}

output "order_checkout_url" {
  value = "https://${azurerm_linux_function_app.order_webhook.default_hostname}/checkout"
}

output "github_actions_deploy_client_id" {
  value = azurerm_user_assigned_identity.github_deploy.client_id
}

output "github_actions_scan_client_id" {
  value = azurerm_user_assigned_identity.github_scan.client_id
}

output "github_actions_tenant_id" {
  value = data.azurerm_client_config.current.tenant_id
}

output "board_images_storage_account_id" {
  value = azurerm_storage_account.board_images.id
}

output "acr_id" {
  value = azurerm_container_registry.main.id
}

output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.main.id
}

output "github_actions_subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}
