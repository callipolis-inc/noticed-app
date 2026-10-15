import fs from 'node:fs';
import path from 'node:path';

function patchFile(filePath, searchTarget, replaceWith) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[patch-spm] File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('enableExperimentalFeature("NonescapableTypes")')) {
    console.log(`[patch-spm] Already patched: ${filePath}`);
    return;
  }
  if (!content.includes(searchTarget)) {
    console.warn(`[patch-spm] Target string not found in ${filePath}`);
    return;
  }
  content = content.replace(searchTarget, replaceWith);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[patch-spm] Successfully patched: ${filePath}`);
}

// 1. Patch RevenueCat Package.swift
const rcPackagePath = path.resolve(
  'node_modules/@revenuecat/purchases-capacitor/Package.swift'
);
patchFile(
  rcPackagePath,
  'path: "ios/Sources/RevenuecatPurchasesCapacitor")',
  'path: "ios/Sources/RevenuecatPurchasesCapacitor",\n            swiftSettings: [\n                .enableExperimentalFeature("NonescapableTypes")\n            ])'
);

// 2. Patch CapApp-SPM Package.swift
const capAppPackagePath = path.resolve('ios/App/CapApp-SPM/Package.swift');
patchFile(
  capAppPackagePath,
  '.product(name: "RevenuecatPurchasesCapacitor", package: "RevenuecatPurchasesCapacitor")\n            ]',
  '.product(name: "RevenuecatPurchasesCapacitor", package: "RevenuecatPurchasesCapacitor")\n            ],\n            swiftSettings: [\n                .enableExperimentalFeature("NonescapableTypes")\n            ]'
);
