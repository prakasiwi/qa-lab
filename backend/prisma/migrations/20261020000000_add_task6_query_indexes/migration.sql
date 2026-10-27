CREATE INDEX "Customer_ownerUserId_createdAt_idx" ON "Customer"("ownerUserId", "createdAt");
CREATE INDEX "Product_ownerUserId_createdAt_idx" ON "Product"("ownerUserId", "createdAt");
CREATE INDEX "Invoice_ownerUserId_createdAt_idx" ON "Invoice"("ownerUserId", "createdAt");
CREATE INDEX "Invoice_ownerUserId_status_createdAt_idx" ON "Invoice"("ownerUserId", "status", "createdAt");
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");
CREATE INDEX "InvoiceHistory_invoiceId_createdAt_idx" ON "InvoiceHistory"("invoiceId", "createdAt");
