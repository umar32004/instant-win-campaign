# Deployment Guide — Azure

## 1. Provision infrastructure

```bash
az login
az group create --name rg-hayatna-prod --location uaenorth

az deployment group create \
  --resource-group rg-hayatna-prod \
  --template-file infra/main.bicep \
  --parameters namePrefix=hayatna-prod sqlAdminPassword='<strong-password>'
```

This creates: App Service (Linux, Node 20) + Plan, Azure SQL Server/Database, Storage Account with
a private `receipts` container, Azure AI Document Intelligence, Key Vault (with the App Service's
managed identity granted secret read access), Log Analytics, and Application Insights.

## 2. Populate secrets in Key Vault

```bash
KV=hayatna-prod-kv

az keyvault secret set --vault-name $KV --name "DATABASE-URL" \
  --value "sqlserver://<sql-fqdn>:1433;database=hayatna_campaign;user=hayatnaadmin;password=<pwd>;encrypt=true"

az keyvault secret set --vault-name $KV --name "JWT-ACCESS-SECRET" --value "$(openssl rand -base64 48)"
az keyvault secret set --vault-name $KV --name "JWT-REFRESH-SECRET" --value "$(openssl rand -base64 48)"
az keyvault secret set --vault-name $KV --name "AZURE-STORAGE-CONNECTION-STRING" \
  --value "$(az storage account show-connection-string -n <storage-account> -o tsv)"
az keyvault secret set --vault-name $KV --name "AZURE-DOCINTEL-KEY" \
  --value "$(az cognitiveservices account keys list -n <docintel-name> -g rg-hayatna-prod --query key1 -o tsv)"
```

## 3. Wire App Service settings to Key Vault references

```bash
APP=hayatna-prod-app

az webapp config appsettings set -g rg-hayatna-prod -n $APP --settings \
  DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://$KV.vault.azure.net/secrets/DATABASE-URL/)" \
  JWT_ACCESS_SECRET="@Microsoft.KeyVault(SecretUri=https://$KV.vault.azure.net/secrets/JWT-ACCESS-SECRET/)" \
  JWT_REFRESH_SECRET="@Microsoft.KeyVault(SecretUri=https://$KV.vault.azure.net/secrets/JWT-REFRESH-SECRET/)" \
  AZURE_STORAGE_CONNECTION_STRING="@Microsoft.KeyVault(SecretUri=https://$KV.vault.azure.net/secrets/AZURE-STORAGE-CONNECTION-STRING/)" \
  AZURE_DOCINTEL_KEY="@Microsoft.KeyVault(SecretUri=https://$KV.vault.azure.net/secrets/AZURE-DOCINTEL-KEY/)"
```

## 4. Run database migrations

From CI (see workflow below) or locally against the production connection string:

```bash
DATABASE_URL="<production-url>" npx prisma migrate deploy
DATABASE_URL="<production-url>" npm run prisma:seed   # first deploy only
```

## 5. Deploy the application

The included GitHub Actions workflow (`.github/workflows/ci-cd.yml`) builds and deploys on every
push to `main`:

```bash
# One-time: create the publish profile secret
az webapp deployment list-publishing-profiles -g rg-hayatna-prod -n hayatna-prod-app --xml \
  > publish-profile.xml
# Paste the contents into a GitHub Actions secret named AZURE_WEBAPP_PUBLISH_PROFILE
```

Alternatively deploy manually:

```bash
npm run build
zip -r app.zip . -x "node_modules/*" ".git/*"
az webapp deploy -g rg-hayatna-prod -n hayatna-prod-app --src-path app.zip --type zip
```

## 6. Post-deploy checklist

- [ ] Confirm `USE_MOCK_CLOUD_SERVICES=false` in App Service settings.
- [ ] Confirm HTTPS-only is enforced (set by the Bicep template).
- [ ] Set `REDIS_URL` (Azure Cache for Redis) if running more than one App Service instance, so
      rate limiting is enforced consistently.
- [ ] Rotate the seeded admin password (`SEED_ADMIN_PASSWORD`) immediately after first login.
- [ ] Confirm Application Insights is receiving telemetry (`APPLICATIONINSIGHTS_CONNECTION_STRING`).
- [ ] Set up Azure Monitor alerts on App Service 5xx rate and SQL DTU/vCore utilization.
