export interface VocabItem {
  korean: string;
  english: string;
  exampleKorean?: string;
  exampleEnglish?: string;
}

export interface VocabCard extends VocabItem {
  id: string;
}

export interface VocabularyUnit {
  id: string;
  name: string;
  description?: string;
  level: string;
  orderIndex: number;
}

export interface VocabularyItemDB {
  id: number;
  unitId: number;
  korean: string;
  english: string;
  orderIndex: number;
}

