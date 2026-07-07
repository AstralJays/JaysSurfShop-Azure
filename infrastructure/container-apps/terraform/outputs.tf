output "application_url" {
  value = "https://${azurerm_container_app.services["frontend"].ingress[0].fqdn}"
}

output "order_webhook_url" {
  value = module.workshop.order_webhook_url
}

output "order_checkout_url" {
  value = module.workshop.order_checkout_url
}

output "acr_login_server" {
  value = module.workshop.acr_login_server
}

output "acr_repository_urls" {
  value = module.workshop.acr_repository_urls
}

output "container_apps_environment_name" {
  value = azurerm_container_app_environment.main.name
}

output "acr_name" {
  value = module.workshop.acr_name
}

output "github_actions_deploy_client_id" {
  value = module.workshop.github_actions_deploy_client_id
}

output "github_actions_scan_client_id" {
  value = module.workshop.github_actions_scan_client_id
}

output "github_actions_tenant_id" {
  value = module.workshop.github_actions_tenant_id
}

output "github_actions_subscription_id" {
  value = module.workshop.github_actions_subscription_id
}

output "demo_exfiltration_url" {
  value = module.workshop.demo_public_blob_url
}

output "internal_service_urls" {
  value = {
    chat-rag        = "https://chat-rag.internal.${azurerm_container_app_environment.main.default_domain}"
    board-generator = "https://board-generator.internal.${azurerm_container_app_environment.main.default_domain}"
  }
}
