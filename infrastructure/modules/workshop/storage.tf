resource "azurerm_storage_account" "board_images" {
  name                     = "${replace(local.name_prefix, "-", "")}boards${local.unique_suffix}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.common_tags
}

resource "azurerm_storage_container" "board_images" {
  name                  = "board-images"
  storage_account_id    = azurerm_storage_account.board_images.id
  container_access_type = "private"
}

# CSPM workshop finding: intentionally public blob container with synthetic PII export
resource "azurerm_storage_account" "demo_public" {
  name                     = "${replace(local.name_prefix, "-", "")}public${local.unique_suffix}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  allow_nested_items_to_be_public = true
  tags                     = merge(local.common_tags, { DemoFinding = "public-blob-container" })
}

resource "azurerm_storage_container" "demo_public" {
  name                  = "exports"
  storage_account_id    = azurerm_storage_account.demo_public.id
  container_access_type = "blob"
}

resource "azurerm_storage_blob" "demo_customer_export" {
  name                   = "customer-export.json"
  storage_account_name   = azurerm_storage_account.demo_public.name
  storage_container_name = azurerm_storage_container.demo_public.name
  type                   = "Block"
  content_type           = "application/json"
  source                 = "${path.module}/../../demo-data/customer-export.json"
}

resource "azurerm_storage_account" "function" {
  name                     = "${replace(local.name_prefix, "-", "")}func${local.unique_suffix}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.common_tags
}
