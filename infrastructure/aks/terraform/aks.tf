resource "azurerm_kubernetes_cluster" "main" {
  name                = "${local.name_prefix}-aks"
  location            = module.workshop.location
  resource_group_name = module.workshop.resource_group_name
  dns_prefix          = local.name_prefix
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name           = "default"
    vm_size        = var.node_vm_size
    node_count     = var.node_count
    vnet_subnet_id = module.workshop.aks_subnet_id
  }

  identity {
    type = "SystemAssigned"
  }

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  network_profile {
    network_plugin = "azure"
  }

  tags = {
    Name = "${local.name_prefix}-aks"
  }
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = module.workshop.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "${local.name_prefix}-app"
  location            = module.workshop.location
  resource_group_name = module.workshop.resource_group_name
}

resource "azurerm_federated_identity_credential" "app" {
  name                = "${local.name_prefix}-app"
  resource_group_name = module.workshop.resource_group_name
  parent_id           = azurerm_user_assigned_identity.app.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.main.oidc_issuer_url
  subject             = "system:serviceaccount:${local.namespace}:app"
}

resource "azurerm_role_assignment" "app_storage_contributor" {
  scope                = module.workshop.board_images_storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# CSPM workshop finding: overprivileged workload identity
resource "azurerm_role_assignment" "app_demo_overprivileged" {
  scope                = "/subscriptions/${module.workshop.subscription_id}"
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
