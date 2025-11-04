import { getDatabase, runMigrations } from '../db/client';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface VocabItem {
  korean: string;
  english: string;
}

function seedVocabulary() {
  const db = getDatabase();

  // Path to frontend vocabulary files
  // From packages/backend, go up two levels to reach root, then to frontend
  const vocabDir = join(process.cwd(), '..', '..', 'frontend', 'src', 'assets', 'vocabulary', 'A1');

  if (!existsSync(vocabDir)) {
    console.error(`❌ Vocabulary directory not found: ${vocabDir}`);
    process.exit(1);
  }

  const files = readdirSync(vocabDir).filter((f) => f.endsWith('.json')).sort();

  console.log(`📚 Found ${files.length} vocabulary files`);

  for (const file of files) {
    const filePath = join(vocabDir, file);
    const unitName = file.replace('.json', ''); // e.g., "voc_1"
    
    // Parse unit number
    const match = unitName.match(/voc_(\d+)/);
    const unitNumber = match ? Number(match[1]) : 0;

    console.log(`\n📖 Processing ${unitName}...`);

    // Read vocabulary items
    const content = readFileSync(filePath, 'utf-8');
    const items: VocabItem[] = JSON.parse(content);

    console.log(`   Found ${items.length} vocabulary items`);

    // Check if unit already exists
    const existingUnit = db
      .query<{ id: number }, string>('SELECT id FROM vocabulary_units WHERE name = ?')
      .get(unitName);

    let unitId: number;

    if (existingUnit) {
      console.log(`   Unit already exists (id: ${existingUnit.id}), updating...`);
      unitId = existingUnit.id;

      // Delete existing items for this unit
      db.query('DELETE FROM vocabulary_items WHERE unit_id = ?').run(unitId);
    } else {
      // Insert unit
      const result = db
        .query(
          'INSERT INTO vocabulary_units (name, description, level, order_index) VALUES (?, ?, ?, ?)'
        )
        .run(unitName, `Unit ${unitNumber}`, 'A1', unitNumber);

      unitId = result.lastInsertRowid as number;
      console.log(`   Created unit (id: ${unitId})`);
    }

    // Insert vocabulary items
    const insertStmt = db.prepare(
      'INSERT INTO vocabulary_items (unit_id, korean, english, order_index) VALUES (?, ?, ?, ?)'
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      insertStmt.run(unitId, item.korean, item.english, i);
    }

    console.log(`   ✅ Inserted ${items.length} items`);
  }

  console.log('\n✨ Vocabulary seeding completed!');
}

// Run migrations first, then seed
console.log('🔧 Running database migrations...');
runMigrations();

console.log('\n🌱 Seeding vocabulary data...');
seedVocabulary();

