import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding SahamGue news database...');

  // Create a seed agent run to satisfy the foreign key
  const run = await prisma.agentRun.create({
    data: {
      agentType: 'seed',
      status: 'success',
      finishedAt: new Date(),
      articlesFound: 5,
      articlesSaved: 5,
    },
  });

  const seeds = [
    {
      headline: 'BBCA Catat Laba Bersih Q4 2025 Tumbuh 8% YoY, Lampaui Ekspektasi Analis',
      summary:
        'Bank Central Asia membukukan laba bersih Rp 14,2 triliun pada Q4 2025, didorong pertumbuhan kredit konsumer dan CASA yang solid.',
      originalUrl: 'https://seed.sahamgue.com/news/bbca-q4-2025',
      source: 'REUTERS ID',
      publishedAt: new Date(Date.now() - 2 * 60 * 1000),
      isLive: true,
      category: 'hot',
      impactLevel: 'high',
      tickers: ['BBCA'],
      aiConfidence: 94,
      views: 8200,
      trendRank: 1,
      whyRelevant: [
        'Laba melampaui konsensus analis sebesar +3%',
        'NIM stabil di 5,4% menandai pricing power kuat',
        'CASA ratio 83% menunjukkan pendanaan murah tetap dominan',
      ],
      estimatedImpact: [
        { ticker: 'BBCA', low: 1.2, high: 2.8, direction: 'positive', timeframe: 'short' },
      ],
      relevanceReason: 'BBCA ada di watchlist kamu',
    },
    {
      headline: 'Bank Indonesia Pertahankan BI Rate 6,00% — Sinyal Dovish Semester II 2026',
      summary:
        'RDG BI mempertahankan suku bunga acuan di 6,00% dengan indikasi pelonggaran di H2 2026 seiring inflasi terkendali 2,3% YoY.',
      originalUrl: 'https://seed.sahamgue.com/news/bi-rate-mar-2026',
      source: 'CNBC INDONESIA',
      publishedAt: new Date(Date.now() - 15 * 60 * 1000),
      isLive: false,
      category: 'critical',
      impactLevel: 'breaking',
      tickers: ['BBCA', 'BBRI', 'BMRI', 'BRIS'],
      aiConfidence: 96,
      views: 42100,
      whyRelevant: [
        'Suku bunga stabil positif untuk NIM perbankan sektor',
        'Ekspektasi rate cut H2 2026 dorong re-rating valuasi saham bank',
        'Rupiah menguat ke Rp 15.650/USD pasca keputusan BI',
      ],
      estimatedImpact: [
        { ticker: 'BBCA', low: 0.5, high: 1.2, direction: 'positive', timeframe: 'medium' },
        { ticker: 'BBRI', low: 0.4, high: 1.0, direction: 'positive', timeframe: 'medium' },
        { ticker: 'BMRI', low: 0.3, high: 0.9, direction: 'positive', timeframe: 'medium' },
      ],
    },
    {
      headline: 'BBRI Salurkan KUR Rp 85 Triliun di Q1 2026, Melampaui Target Pemerintah',
      summary:
        'BBRI berhasil menyalurkan KUR sebesar Rp 85 triliun di Q1 2026, melampaui target pemerintah Rp 75 triliun. NPL segmen mikro turun ke 2,1%.',
      originalUrl: 'https://seed.sahamgue.com/news/bbri-kur-q1-2026',
      source: 'DETIK FINANCE',
      publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      isLive: false,
      category: 'popular',
      impactLevel: 'fundamental',
      tickers: ['BBRI'],
      aiConfidence: 82,
      views: 9800,
      trendRank: 2,
      whyRelevant: [
        'Penurunan NPL menandai perbaikan kualitas aset segmen mikro',
        'Dukungan pemerintah perkuat posisi market leader segmen KUR',
      ],
      estimatedImpact: [
        { ticker: 'BBRI', low: 0.5, high: 1.2, direction: 'positive', timeframe: 'medium' },
      ],
      relevanceReason: 'BBRI ada di watchlist kamu',
    },
    {
      headline: 'Astra International Laporkan Penjualan Otomotif Turun 8% YoY di Februari 2026',
      summary:
        'Penjualan mobil turun 8% YoY di Februari 2026 menjadi 78.200 unit, berdampak langsung pada segmen otomotif ASII yang menguasai 54% pangsa pasar.',
      originalUrl: 'https://seed.sahamgue.com/news/asii-automotive-feb-2026',
      source: 'BISNIS.COM',
      publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
      isLive: false,
      category: 'critical',
      impactLevel: 'high',
      tickers: ['ASII'],
      aiConfidence: 86,
      views: 10700,
      whyRelevant: [
        'Penurunan penjualan otomotif Q1 berpotensi tekan EPS 2026',
        'Segmen alat berat dan pertambangan ASII bisa mengimbangi',
      ],
      estimatedImpact: [
        { ticker: 'ASII', low: -1.5, high: -0.5, direction: 'negative', timeframe: 'short' },
      ],
    },
    {
      headline: 'OJK Terbitkan Regulasi ESG untuk Perbankan Nasional — Implementasi 2027',
      summary:
        'OJK mewajibkan bank dengan aset di atas Rp 100 triliun menerbitkan laporan keberlanjutan (ESG) terstandar mulai 2027.',
      originalUrl: 'https://seed.sahamgue.com/news/ojk-esg-regulasi-2027',
      source: 'KONTAN',
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      isLive: false,
      category: 'latest',
      impactLevel: 'regulatory',
      tickers: ['BBCA', 'BMRI', 'IHSG'],
      aiConfidence: 72,
      views: 5600,
      whyRelevant: [
        'Biaya implementasi sistem pelaporan ESG Rp 200-400 miliar per bank',
        'Investor ESG global lebih tertarik pada emiten yang patuh sejak dini',
      ],
      estimatedImpact: [
        { ticker: 'BBCA', low: -0.3, high: 0.2, direction: 'negative', timeframe: 'long' },
      ],
    },
  ];

  let seeded = 0;
  for (const s of seeds) {
    await prisma.newsItem.upsert({
      where: { originalUrl: s.originalUrl },
      update: {},
      create: { ...s, agentRunId: run.id, isActive: true },
    });
    seeded++;
  }

  console.log(`✅  Seeded ${seeded} IDX news articles.`);
  console.log(`📋  Agent run ID: ${run.id}`);
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
