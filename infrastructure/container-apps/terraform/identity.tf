resource "azurerm_key_vault_access_policy" "aca_apps" {
  key_vault_id = module.workshop.key_vault_id
  tenant_id    = module.workshop.tenant_id
  object_id    = azurerm_user_assigned_identity.apps.principal_id

  secret_permissions = ["Get", "List"]
}
