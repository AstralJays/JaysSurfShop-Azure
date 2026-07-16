resource "azurerm_storage_account" "board_images" {
  name                     = "${local.storage_compact}brd${local.unique_suffix}"
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
  name                     = "${local.storage_compact}pub${local.unique_suffix}"
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
  # "container" = anonymous list + read (CSPM public container finding)
  # "blob" only allows object GET without listing
  container_access_type = "container"
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
  name                     = "${local.storage_compact}fn${local.unique_suffix}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.common_tags
}
