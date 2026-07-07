resource "azurerm_container_registry" "main" {
  name                = "${replace(local.name_prefix, "-", "")}acr${local.unique_suffix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.common_tags
}

resource "azurerm_container_registry_scope_map" "push" {
  name                    = "${local.name_prefix}-push"
  container_registry_name = azurerm_container_registry.main.name
  resource_group_name     = azurerm_resource_group.main.name
  actions = [
    "repositories/*/content/read",
    "repositories/*/content/write",
    "repositories/*/metadata/read",
    "repositories/*/metadata/write",
  ]
}

resource "azurerm_container_registry_scope_map" "pull" {
  name                    = "${local.name_prefix}-pull"
  container_registry_name = azurerm_container_registry.main.name
  resource_group_name     = azurerm_resource_group.main.name
  actions = [
    "repositories/*/content/read",
    "repositories/*/metadata/read",
  ]
}
