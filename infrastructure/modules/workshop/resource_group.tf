resource "azurerm_resource_group" "main" {
  name     = local.name_prefix
  location = var.location
  tags     = local.common_tags
}
