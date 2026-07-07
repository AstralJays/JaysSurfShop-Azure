output "application_url" {
  value = "http://${kubernetes_service.services["frontend"].status[0].load_balancer[0].ingress[0].ip}"
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

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
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
