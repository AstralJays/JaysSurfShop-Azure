resource "azurerm_user_assigned_identity" "github_deploy" {
  name                = "${local.name_prefix}-github-deploy"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

resource "azurerm_user_assigned_identity" "github_scan" {
  name                = "${local.name_prefix}-github-scan"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

resource "azurerm_federated_identity_credential" "github_deploy" {
  name                = "${local.name_prefix}-github-deploy"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_deploy.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.github_deploy_repo}:*"
}

resource "azurerm_federated_identity_credential" "github_scan_deploy" {
  name                = "${local.name_prefix}-github-scan-deploy"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_scan.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.github_deploy_repo}:*"
}

resource "azurerm_federated_identity_credential" "github_scan_external" {
  name                = "${local.name_prefix}-github-scan-external"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_scan.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.github_scan_repo}:*"
}

resource "azurerm_role_assignment" "github_deploy_acr_push" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
}

resource "azurerm_role_assignment" "github_scan_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.github_scan.principal_id
}
