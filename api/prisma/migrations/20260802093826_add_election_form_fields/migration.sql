-- CreateTable
CREATE TABLE "ElectionFormField" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "maxFileSize" INTEGER,
    "acceptedTypes" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateFormResponse" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElectionFormField_electionId_idx" ON "ElectionFormField"("electionId");

-- CreateIndex
CREATE INDEX "CandidateFormResponse_candidateId_idx" ON "CandidateFormResponse"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateFormResponse_candidateId_fieldId_key" ON "CandidateFormResponse"("candidateId", "fieldId");

-- AddForeignKey
ALTER TABLE "ElectionFormField" ADD CONSTRAINT "ElectionFormField_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateFormResponse" ADD CONSTRAINT "CandidateFormResponse_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateFormResponse" ADD CONSTRAINT "CandidateFormResponse_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "ElectionFormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

