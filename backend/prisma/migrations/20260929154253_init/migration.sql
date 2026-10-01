-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emergencyType" TEXT NOT NULL,
    "emergencyLocation" TEXT NOT NULL,
    "peopleAffected" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'CRITICAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergencies" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "algorithm_results" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "algorithmName" TEXT NOT NULL,
    "executionTime" DOUBLE PRECISION NOT NULL,
    "nodesVisited" INTEGER NOT NULL,
    "edgesProcessed" INTEGER NOT NULL,
    "resultCost" DOUBLE PRECISION NOT NULL,
    "spaceComplexity" TEXT NOT NULL,
    "timeComplexity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "algorithm_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evacuation_plans" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "primaryExit" TEXT NOT NULL,
    "secondaryExit" TEXT,
    "totalDistance" DOUBLE PRECISION NOT NULL,
    "estimatedTime" DOUBLE PRECISION NOT NULL,
    "peopleEvacuated" INTEGER NOT NULL,
    "routeData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evacuation_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_allocations" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "totalAvailable" INTEGER NOT NULL,
    "totalUsed" INTEGER NOT NULL,
    "benefitScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emergencies_scenarioId_idx" ON "emergencies"("scenarioId");

-- CreateIndex
CREATE INDEX "algorithm_results_scenarioId_idx" ON "algorithm_results"("scenarioId");

-- CreateIndex
CREATE INDEX "evacuation_plans_scenarioId_idx" ON "evacuation_plans"("scenarioId");

-- CreateIndex
CREATE INDEX "resource_allocations_scenarioId_idx" ON "resource_allocations"("scenarioId");

-- AddForeignKey
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "algorithm_results" ADD CONSTRAINT "algorithm_results_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evacuation_plans" ADD CONSTRAINT "evacuation_plans_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
