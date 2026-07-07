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

locals {
  # Azure requires exact GitHub OIDC subject claims (repo:...:* does not match ref:refs/heads/main).
  github_deploy_subjects = [
    "repo:${var.github_deploy_repo}:ref:refs/heads/main",
    "repo:${var.github_deploy_repo}:pull_request",
  ]
  github_scan_subjects = [
    "repo:${var.github_deploy_repo}:ref:refs/heads/main",
    "repo:${var.github_deploy_repo}:pull_request",
    "repo:${var.github_scan_repo}:ref:refs/heads/main",
    "repo:${var.github_scan_repo}:pull_request",
  ]
}

resource "azurerm_federated_identity_credential" "github_deploy" {
  for_each = toset(local.github_deploy_subjects)

  name                = "${local.name_prefix}-gh-deploy-${replace(replace(each.value, ":", "-"), "/", "-")}"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_deploy.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = each.value
}

resource "azurerm_federated_identity_credential" "github_scan" {
  for_each = toset(local.github_scan_subjects)

  name                = "${local.name_prefix}-gh-scan-${replace(replace(each.value, ":", "-"), "/", "-")}"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_scan.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = each.value
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
