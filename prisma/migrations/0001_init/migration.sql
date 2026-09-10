BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[campaigns] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(2000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [campaigns_status_df] DEFAULT 'DRAFT',
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [minPurchaseAmountAed] DECIMAL(10,2) NOT NULL CONSTRAINT [campaigns_minPurchaseAmountAed_df] DEFAULT 0,
    [receiptConfidenceThreshold] FLOAT(53) NOT NULL CONSTRAINT [campaigns_receiptConfidenceThreshold_df] DEFAULT 0.6,
    [maxSubmissionsPerUserPerDay] INT NOT NULL CONSTRAINT [campaigns_maxSubmissionsPerUserPerDay_df] DEFAULT 3,
    [fuzzyMatchThreshold] FLOAT(53) NOT NULL CONSTRAINT [campaigns_fuzzyMatchThreshold_df] DEFAULT 0.72,
    [termsUrl] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [campaigns_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [campaigns_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [campaigns_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[prizes] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaignId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [imageUrl] NVARCHAR(1000),
    [tier] NVARCHAR(1000) NOT NULL CONSTRAINT [prizes_tier_df] DEFAULT 'STANDARD',
    [probabilityWeight] FLOAT(53) NOT NULL CONSTRAINT [prizes_probabilityWeight_df] DEFAULT 1,
    [isActive] BIT NOT NULL CONSTRAINT [prizes_isActive_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [prizes_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [prizes_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [prizes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[prize_inventory] (
    [id] NVARCHAR(1000) NOT NULL,
    [prizeId] NVARCHAR(1000) NOT NULL,
    [totalStock] INT NOT NULL,
    [remainingStock] INT NOT NULL,
    [dailyLimit] INT,
    [dailyAwarded] INT NOT NULL CONSTRAINT [prize_inventory_dailyAwarded_df] DEFAULT 0,
    [weeklyLimit] INT,
    [weeklyAwarded] INT NOT NULL CONSTRAINT [prize_inventory_weeklyAwarded_df] DEFAULT 0,
    [campaignLimit] INT,
    [campaignAwarded] INT NOT NULL CONSTRAINT [prize_inventory_campaignAwarded_df] DEFAULT 0,
    [lastDailyReset] DATETIME2 NOT NULL CONSTRAINT [prize_inventory_lastDailyReset_df] DEFAULT CURRENT_TIMESTAMP,
    [lastWeeklyReset] DATETIME2 NOT NULL CONSTRAINT [prize_inventory_lastWeeklyReset_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [prize_inventory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [prize_inventory_prizeId_key] UNIQUE NONCLUSTERED ([prizeId])
);

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [fullName] NVARCHAR(1000) NOT NULL,
    [mobileNumber] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [emirate] NVARCHAR(1000) NOT NULL,
    [ageConfirmed] BIT NOT NULL CONSTRAINT [users_ageConfirmed_df] DEFAULT 0,
    [termsAcceptedAt] DATETIME2,
    [registrationIp] NVARCHAR(1000),
    [deviceFingerprint] NVARCHAR(1000),
    [isBlacklisted] BIT NOT NULL CONSTRAINT [users_isBlacklisted_df] DEFAULT 0,
    [blacklistReason] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_mobileNumber_key] UNIQUE NONCLUSTERED ([mobileNumber]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[otp_verifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [mobileNumber] NVARCHAR(1000) NOT NULL,
    [otpHash] NVARCHAR(1000) NOT NULL,
    [purpose] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [attempts] INT NOT NULL CONSTRAINT [otp_verifications_attempts_df] DEFAULT 0,
    [verified] BIT NOT NULL CONSTRAINT [otp_verifications_verified_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [otp_verifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [otp_verifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[receipts] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [campaignId] NVARCHAR(1000) NOT NULL,
    [storeNameRaw] NVARCHAR(1000),
    [storeNameNormalized] NVARCHAR(1000),
    [receiptNumber] NVARCHAR(1000),
    [transactionDate] DATETIME2,
    [currency] NVARCHAR(1000),
    [totalAmount] DECIMAL(10,2),
    [subtotal] DECIMAL(10,2),
    [taxAmount] DECIMAL(10,2),
    [imageUrl] NVARCHAR(1000) NOT NULL,
    [imageSha256] NVARCHAR(1000) NOT NULL,
    [ocrConfidence] FLOAT(53),
    [ocrRawResult] NVARCHAR(4000),
    [hayatnaProductDetected] BIT NOT NULL CONSTRAINT [receipts_hayatnaProductDetected_df] DEFAULT 0,
    [hayatnaConfidence] FLOAT(53),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [receipts_status_df] DEFAULT 'PENDING',
    [rejectionReason] NVARCHAR(1000),
    [ipAddress] NVARCHAR(1000),
    [deviceFingerprint] NVARCHAR(1000),
    [isBlacklisted] BIT NOT NULL CONSTRAINT [receipts_isBlacklisted_df] DEFAULT 0,
    [blacklistReason] NVARCHAR(1000),
    [submittedAt] DATETIME2 NOT NULL CONSTRAINT [receipts_submittedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [verifiedAt] DATETIME2,
    CONSTRAINT [receipts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[receipt_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [receiptId] NVARCHAR(1000) NOT NULL,
    [rawText] NVARCHAR(1000) NOT NULL,
    [normalizedName] NVARCHAR(1000),
    [matchedSku] NVARCHAR(1000),
    [isHayatnaProduct] BIT NOT NULL CONSTRAINT [receipt_items_isHayatnaProduct_df] DEFAULT 0,
    [matchConfidence] FLOAT(53),
    [quantity] FLOAT(53),
    [unitPrice] DECIMAL(10,2),
    [lineTotal] DECIMAL(10,2),
    CONSTRAINT [receipt_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[winners] (
    [id] NVARCHAR(1000) NOT NULL,
    [winnerCode] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [receiptId] NVARCHAR(1000) NOT NULL,
    [prizeId] NVARCHAR(1000) NOT NULL,
    [campaignId] NVARCHAR(1000) NOT NULL,
    [storeName] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [winners_status_df] DEFAULT 'PENDING_REDEMPTION',
    [redemptionCode] NVARCHAR(1000) NOT NULL,
    [wonAt] DATETIME2 NOT NULL CONSTRAINT [winners_wonAt_df] DEFAULT CURRENT_TIMESTAMP,
    [redeemedAt] DATETIME2,
    [notes] NVARCHAR(1000),
    CONSTRAINT [winners_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [winners_winnerCode_key] UNIQUE NONCLUSTERED ([winnerCode]),
    CONSTRAINT [winners_receiptId_key] UNIQUE NONCLUSTERED ([receiptId]),
    CONSTRAINT [winners_redemptionCode_key] UNIQUE NONCLUSTERED ([redemptionCode])
);

-- CreateTable
CREATE TABLE [dbo].[admins] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [admins_role_df] DEFAULT 'ADMIN',
    [isActive] BIT NOT NULL CONSTRAINT [admins_isActive_df] DEFAULT 1,
    [lastLoginAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [admins_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [admins_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [admins_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [actorType] NVARCHAR(1000) NOT NULL,
    [actorId] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000),
    [metadata] NVARCHAR(4000),
    [ipAddress] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [audit_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[system_settings] (
    [id] NVARCHAR(1000) NOT NULL,
    [key] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(2000) NOT NULL,
    [description] NVARCHAR(1000),
    [updatedBy] NVARCHAR(1000),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [system_settings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [system_settings_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [channel] NVARCHAR(1000) NOT NULL CONSTRAINT [notifications_channel_df] DEFAULT 'IN_APP',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [notifications_status_df] DEFAULT 'PENDING',
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [sentAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [notifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[fraud_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [receiptId] NVARCHAR(1000),
    [ruleTriggered] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL CONSTRAINT [fraud_logs_severity_df] DEFAULT 'MEDIUM',
    [details] NVARCHAR(2000),
    [ipAddress] NVARCHAR(1000),
    [deviceFingerprint] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [fraud_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [fraud_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [prizes_campaignId_idx] ON [dbo].[prizes]([campaignId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_mobileNumber_idx] ON [dbo].[users]([mobileNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_email_idx] ON [dbo].[users]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [otp_verifications_mobileNumber_purpose_idx] ON [dbo].[otp_verifications]([mobileNumber], [purpose]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [receipts_userId_idx] ON [dbo].[receipts]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [receipts_campaignId_idx] ON [dbo].[receipts]([campaignId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [receipts_receiptNumber_idx] ON [dbo].[receipts]([receiptNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [receipts_imageSha256_idx] ON [dbo].[receipts]([imageSha256]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [receipts_status_idx] ON [dbo].[receipts]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [receipt_items_receiptId_idx] ON [dbo].[receipt_items]([receiptId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [winners_userId_idx] ON [dbo].[winners]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [winners_prizeId_idx] ON [dbo].[winners]([prizeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [winners_campaignId_idx] ON [dbo].[winners]([campaignId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_entityType_entityId_idx] ON [dbo].[audit_logs]([entityType], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_actorId_idx] ON [dbo].[audit_logs]([actorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_userId_idx] ON [dbo].[notifications]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [fraud_logs_userId_idx] ON [dbo].[fraud_logs]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [fraud_logs_receiptId_idx] ON [dbo].[fraud_logs]([receiptId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [fraud_logs_ruleTriggered_idx] ON [dbo].[fraud_logs]([ruleTriggered]);

-- AddForeignKey
ALTER TABLE [dbo].[prizes] ADD CONSTRAINT [prizes_campaignId_fkey] FOREIGN KEY ([campaignId]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[prize_inventory] ADD CONSTRAINT [prize_inventory_prizeId_fkey] FOREIGN KEY ([prizeId]) REFERENCES [dbo].[prizes]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[receipts] ADD CONSTRAINT [receipts_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[receipts] ADD CONSTRAINT [receipts_campaignId_fkey] FOREIGN KEY ([campaignId]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[receipt_items] ADD CONSTRAINT [receipt_items_receiptId_fkey] FOREIGN KEY ([receiptId]) REFERENCES [dbo].[receipts]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[winners] ADD CONSTRAINT [winners_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[winners] ADD CONSTRAINT [winners_receiptId_fkey] FOREIGN KEY ([receiptId]) REFERENCES [dbo].[receipts]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[winners] ADD CONSTRAINT [winners_prizeId_fkey] FOREIGN KEY ([prizeId]) REFERENCES [dbo].[prizes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[winners] ADD CONSTRAINT [winners_campaignId_fkey] FOREIGN KEY ([campaignId]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[fraud_logs] ADD CONSTRAINT [fraud_logs_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[fraud_logs] ADD CONSTRAINT [fraud_logs_receiptId_fkey] FOREIGN KEY ([receiptId]) REFERENCES [dbo].[receipts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

