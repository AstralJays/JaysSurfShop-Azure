# Workshop identity misconfigurations — realistic Azure attack paths for Cloud XDR demos.
# 1) Overprivileged workload managed identity (IMDS / federated token theft) — aks.tf / container_apps.tf
# 2) Leaked service principal client secret (CI / GitHub / image artifact)
# 3) Dev SP granted User Access Administrator — roleAssignments/write abuse
# 4) Key Vault secrets reachable via overprivileged identities

resource "azuread_application" "workshop_dev" {
  display_name = "${local.name_prefix}-dev-sp"
}

resource "azuread_service_principal" "workshop_dev" {
  client_id = azuread_application.workshop_dev.client_id
}

resource "azuread_application_password" "workshop_dev_leaked" {
  application_id = azuread_application.workshop_dev.id
  display_name   = "leaked-ci-secret"
}

# Privilege escalation: can grant Owner / Contributor / Key Vault Admin to any identity
resource "azurerm_role_assignment" "dev_sp_user_access_admin" {
  scope                = "/subscriptions/${data.azurerm_client_config.current.subscription_id}"
  role_definition_name = "User Access Administrator"
  principal_id         = azuread_service_principal.workshop_dev.object_id
}

resource "azurerm_role_assignment" "dev_sp_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.workshop_dev.object_id
}

resource "azurerm_key_vault_secret" "workshop_db_password" {
  name         = "workshop-db-password"
  value        = "SurfShopDemoDB2024!"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]
}

resource "azurerm_key_vault_secret" "workshop_api_key" {
  name         = "workshop-api-key"
  value        = "jss-demo-api-key-${local.unique_suffix}"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]
}

resource "azurerm_key_vault_secret" "workshop_storage_key" {
  name         = "workshop-storage-key"
  value        = azurerm_storage_account.board_images.primary_access_key
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]
}

resource "azurerm_key_vault_access_policy" "dev_sp" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azuread_service_principal.workshop_dev.object_id

  secret_permissions = ["Get", "List", "Set"]
}

locals {
  leaked_sp_credentials = jsonencode({
    tenant_id       = data.azurerm_client_config.current.tenant_id
    client_id       = azuread_application.workshop_dev.client_id
    client_secret   = azuread_application_password.workshop_dev_leaked.value
    object_id       = azuread_service_principal.workshop_dev.object_id
    subscription_id = data.azurerm_client_config.current.subscription_id
    note            = "Leaked from CI pipeline / Terraform state / committed config — workshop only"
  })
}

# CSPM finding: long-lived SP secret leaked to public blob container
resource "azurerm_storage_blob" "leaked_sp_credentials" {
  name                   = "ci-artifacts/leaked-sp-credentials.json"
  storage_account_name   = azurerm_storage_account.demo_public.name
  storage_container_name = azurerm_storage_container.demo_public.name
  type                   = "Block"
  content_type           = "application/json"
  source_content         = local.leaked_sp_credentials

  depends_on = [azurerm_storage_blob.demo_customer_export]
}
