// RESTYLED: SahamGue Design System
// AI News Feature — Production-ready with dummy data stubs
import React, { useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────
const SG = {
  bgBase:    '#0a0f10', bgHeader:  '#0d1417', bgSurface: '#151b1e',
  bgMuted:   '#1e2a2f', border:    '#1e2a2f', accent:    '#22c55e',
  red:       '#ef4444', gold:      '#facc15', textPrimary:'#f1f5f9',
  textSecond:'#94a3b8', textMuted: '#64748b', textDim:   '#475569',
  mono: "'JetBrains Mono',monospace",
  sans: "'Plus Jakarta Sans',sans-serif",
};

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
export type ImpactLevel = 'breaking'|'high'|'medium'|'low'|'fundamental'|'regulatory';
export type NewsSource  = 'REUTERS ID'|'CNBC INDONESIA'|'DETIK FINANCE'|'BISNIS.COM'|'KONTAN'|'IDX CHANNEL';
export type NewsCategory= 'hot'|'latest'|'critical'|'popular'|'personalized';

export interface EstimatedImpact {
  ticker: string; low: number; high: number;
  direction: 'positive'|'negative'|'neutral';
  timeframe: 'short'|'medium'|'long';
}
export interface NewsItem {
  id: string; headline: string; summary: string;
  source: NewsSource; publishedAt: string;
  categories: NewsCategory[];
  impactLevel: ImpactLevel;
  tickers: string[]; aiConfidence: number;
  estimatedImpact: EstimatedImpact[];
  whyRelevant: string[];
  relevanceReason?: string;
  views: number; trendRank?: number;
}

// ─────────────────────────────────────────────────────────
// IMPACT TAG SYSTEM
// ─────────────────────────────────────────────────────────
const IMPACT_TAGS: Record<ImpactLevel,{label:string;bg:string;text:string}> = {
  breaking:    { label:'⚡ Breaking',    bg:'#7c3aed', text:'#fff'     },
  high:        { label:'🔴 High Impact', bg:'#991b1b', text:'#fca5a5'  },
  medium:      { label:'🟡 Medium',      bg:'#78350f', text:'#fde68a'  },
  low:         { label:'🟢 Low Impact',  bg:'#14532d', text:'#bbf7d0'  },
  fundamental: { label:'📊 Fundamental', bg:'#1e3a5f', text:'#93c5fd'  },
  regulatory:  { label:'🏛️ Regulatory', bg:'#3b1f5e', text:'#d8b4fe'  },
};

// ─────────────────────────────────────────────────────────
// NAV ITEMS (with News at position 4)
// ─────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id:'home',     icon:'🏠', label:'Home'     },
  { id:'analysis', icon:'📊', label:'Analisis' },
  { id:'watchlist',icon:'👁', label:'Watchlist'},
  { id:'news',     icon:'📰', label:'News'     },
  { id:'journal',  icon:'📓', label:'Jurnal'   },
  { id:'learning', icon:'🎓', label:'Belajar'  },
];

// ─────────────────────────────────────────────────────────
// DUMMY NEWS DATA — 15 realistic Indonesian stock news items
// ─────────────────────────────────────────────────────────
const NOW = new Date('2026-03-10T22:30:00+07:00');
const minsAgo = (m: number) => new Date(NOW.getTime() - m*60000).toISOString();

export const DUMMY_NEWS: NewsItem[] = [
  {
    id:'n1', tickers:['BBCA'],
    headline:'BBCA Cetak Laba Bersih Q4 2025 Rp 14,2 Triliun, Melampaui Estimasi Analis',
    summary:'Bank Central Asia membukukan laba bersih kuartal keempat sebesar Rp 14,2 triliun, melampaui konsensus analis sebesar Rp 13,5 triliun. Pertumbuhan ditopang oleh kredit digital dan fee-based income.',
    source:'BISNIS.COM', publishedAt:minsAgo(8),
    categories:['personalized','hot'],
    impactLevel:'high', aiConfidence:91, views:18400, trendRank:1,
    estimatedImpact:[{ticker:'BBCA',low:1.2,high:2.8,direction:'positive',timeframe:'short'}],
    whyRelevant:['Kenaikan laba bersih Q4 meningkatkan sentimen investor','Analis upgrade target harga dari Rp 9.500 → Rp 10.500','Volume beli asing meningkat 3 hari berturut-turut'],
    relevanceReason:'Relevan karena kamu memiliki $BBCA',
  },
  {
    id:'n2', tickers:['BBCA'],
    headline:'Analis Mandiri Sekuritas Upgrade Target Harga BBCA ke Rp 11.000, Rating Buy',
    summary:'Mandiri Sekuritas menaikkan target harga BBCA dari Rp 9.800 menjadi Rp 11.000 dengan rekomendasi Buy, mengutip percepatan adopsi digital banking dan margin bunga yang stabil.',
    source:'KONTAN', publishedAt:minsAgo(45),
    categories:['personalized','popular'],
    impactLevel:'fundamental', aiConfidence:85, views:9200, trendRank:2,
    estimatedImpact:[{ticker:'BBCA',low:0.8,high:1.5,direction:'positive',timeframe:'medium'}],
    whyRelevant:['Upgrade rating dari institusi terkemuka','Target harga baru 8,3% di atas harga pasar saat ini'],
    relevanceReason:'Relevan karena kamu memiliki $BBCA',
  },
  {
    id:'n3', tickers:['BBCA'],
    headline:'BBCA Luncurkan Fitur Investasi Reksa Dana di Myca, Target 2 Juta Nasabah Baru',
    summary:'BCA secara resmi meluncurkan platform investasi reksa dana terintegrasi di aplikasi Myca, membidik 2 juta nasabah baru pada akhir 2026 dan memperkuat posisi sebagai super-app keuangan.',
    source:'CNBC INDONESIA', publishedAt:minsAgo(120),
    categories:['personalized','latest'],
    impactLevel:'medium', aiConfidence:74, views:6700,
    estimatedImpact:[{ticker:'BBCA',low:0.3,high:0.9,direction:'positive',timeframe:'long'}],
    whyRelevant:['Ekspansi ke wealth management memperluas basis pendapatan','Kompetisi dengan GOTO Financial dan OVO meningkat'],
    relevanceReason:'Relevan karena kamu memiliki $BBCA',
  },
  {
    id:'n4', tickers:['GOTO'],
    headline:'GoTo Catat Surplus Operasional Pertama, Volume GMV Tembus Rp 180 Triliun',
    summary:'PT GoTo Gojek Tokopedia mencatat surplus operasional pertama sepanjang sejarah perusahaan di Q4 2025 dengan Gross Merchandise Value Rp 180 triliun. Segmen fintech GoTo Financial menjadi pendorong utama.',
    source:'REUTERS ID', publishedAt:minsAgo(3),
    categories:['hot','personalized','latest'],
    impactLevel:'breaking', aiConfidence:94, views:31500, trendRank:1,
    estimatedImpact:[{ticker:'GOTO',low:3.5,high:6.2,direction:'positive',timeframe:'short'}],
    whyRelevant:['Surplus operasional pertama merupakan milestone kritis bagi investor','Analis perkirakan re-rating valuation secara signifikan','Volume perdagangan saham GOTO melonjak 4x rata-rata harian'],
    relevanceReason:'$GOTO ada di watchlist kamu',
  },
  {
    id:'n5', tickers:['GOTO','TLKM'],
    headline:'GoTo dan Telkom Umumkan Kemitraan Super-App B2B Untuk UMKM Indonesia',
    summary:'GoTo dan Telkom Indonesia menandatangani nota kesepahaman untuk mengintegrasikan layanan logistik dan pembayaran digital bagi 60 juta UMKM di Indonesia, efektif Q2 2026.',
    source:'IDX CHANNEL', publishedAt:minsAgo(180),
    categories:['personalized','latest'],
    impactLevel:'medium', aiConfidence:79, views:8900,
    estimatedImpact:[{ticker:'GOTO',low:0.5,high:1.8,direction:'positive',timeframe:'medium'},{ticker:'TLKM',low:0.2,high:0.8,direction:'positive',timeframe:'long'}],
    whyRelevant:['Sinergi dua perusahaan teknologi besar menciptakan value baru','Potensi cross-selling segmen korporasi B2B'],
    relevanceReason:'$GOTO ada di watchlist kamu',
  },
  {
    id:'n6', tickers:['TLKM'],
    headline:'OJK Terbitkan Aturan Baru Layanan Digital Perbankan, TLKM DiSebut Terdampak',
    summary:'Otoritas Jasa Keuangan menerbitkan POJK No. 15/2026 yang mengatur layanan keuangan digital berbasis telekomunikasi. TLKM sebagai operator infrastruktur wajib menyesuaikan standar keamanan data.',
    source:'BISNIS.COM', publishedAt:minsAgo(240),
    categories:['critical','personalized'],
    impactLevel:'regulatory', aiConfidence:81, views:11200,
    estimatedImpact:[{ticker:'TLKM',low:-0.8,high:-0.2,direction:'negative',timeframe:'medium'}],
    whyRelevant:['Biaya kepatuhan regulasi diperkirakan Rp 500-800 miliar','Implementasi dalam 12 bulan, dampak margin terbatas'],
    relevanceReason:'$TLKM ada di watchlist kamu',
  },
  {
    id:'n7', tickers:['TLKM'],
    headline:'Telkom Indonesia Raih Kontrak Pembangunan Jaringan 5G Nasional Senilai Rp 12 Triliun',
    summary:'TLKM memenangkan tender pemerintah untuk pembangunan infrastruktur 5G di 34 provinsi dengan nilai kontrak Rp 12 triliun. Proyek berlangsung 2026-2028 dengan cicilan pembayaran tahunan.',
    source:'KONTAN', publishedAt:minsAgo(360),
    categories:['popular','hot'],
    impactLevel:'high', aiConfidence:88, views:14300, trendRank:3,
    estimatedImpact:[{ticker:'TLKM',low:1.5,high:3.2,direction:'positive',timeframe:'long'}],
    whyRelevant:['Kontrak jangka panjang memberikan kepastian pendapatan','Proyeksi peningkatan EPS 2027 sebesar 12-15%'],
  },
  {
    id:'n8', tickers:['BBRI'],
    headline:'BBRI Salurkan KUR Rp 85 Triliun di Q1 2026, Melampaui Target Pemerintah',
    summary:'Bank Rakyat Indonesia berhasil menyalurkan Kredit Usaha Rakyat sebesar Rp 85 triliun di kuartal pertama 2026, melampaui target pemerintah Rp 75 triliun. NPL segmen mikro turun ke 2,1%.',
    source:'DETIK FINANCE', publishedAt:minsAgo(420),
    categories:['personalized','popular'],
    impactLevel:'fundamental', aiConfidence:82, views:9800,
    estimatedImpact:[{ticker:'BBRI',low:0.5,high:1.2,direction:'positive',timeframe:'medium'}],
    whyRelevant:['Penurunan NPL menandai perbaikan kualitas aset','Dukungan pemerintah mempertahankan posisi market leader segmen mikro'],
    relevanceReason:'$BBRI ada di watchlist kamu',
  },
  {
    id:'n9', tickers:['BBRI'],
    headline:'BBRI Umumkan Rencana Dividen Interim Rp 250 Per Saham, Yield 5,9%',
    summary:'Dirut BBRI mengumumkan rencana pembagian dividen interim sebesar Rp 250 per saham dengan yield 5,9% berdasarkan harga pasar saat ini. Cum date ditetapkan 15 April 2026.',
    source:'IDX CHANNEL', publishedAt:minsAgo(600),
    categories:['personalized','popular'],
    impactLevel:'medium', aiConfidence:90, views:16800, trendRank:2,
    estimatedImpact:[{ticker:'BBRI',low:0.8,high:1.5,direction:'positive',timeframe:'short'}],
    whyRelevant:['Yield dividen kompetitif vs deposito','Momentum beli menjelang cum date biasanya signifikan'],
    relevanceReason:'$BBRI ada di watchlist kamu',
  },
  {
    id:'n10', tickers:['BBCA','BBRI','BMRI','BRIS'],
    headline:'Bank Indonesia Pertahankan BI Rate 6,00% — Sinyal Dovish untuk Semester II 2026',
    summary:'Rapat Dewan Gubernur Bank Indonesia mempertahankan suku bunga acuan di 6,00%, namun memberikan sinyal pelonggaran di semester II 2026 seiring inflasi yang terkendali di 2,3% YoY.',
    source:'REUTERS ID', publishedAt:minsAgo(15),
    categories:['hot','critical','personalized','latest'],
    impactLevel:'breaking', aiConfidence:96, views:42100,
    estimatedImpact:[
      {ticker:'BBCA',low:0.5,high:1.2,direction:'positive',timeframe:'medium'},
      {ticker:'BBRI',low:0.4,high:1.0,direction:'positive',timeframe:'medium'},
    ],
    whyRelevant:['Suku bunga stabil positif untuk NIM perbankan','Ekspektasi penurunan rate H2 2026 dorong valuasi saham bank','Rupiah menguat ke Rp 15.650/USD pasca keputusan BI'],
    relevanceReason:'Relevan karena kamu memiliki saham sektor perbankan',
  },
  {
    id:'n11', tickers:['IHSG'],
    headline:'Rupiah Menguat ke Rp 15.620/USD Setelah Data Inflasi AS Lebih Rendah dari Ekspektasi',
    summary:'Nilai tukar Rupiah menguat ke Rp 15.620 per dolar AS pada perdagangan sore, terbantu data CPI Amerika yang turun ke 2,8% YoY, meringankan tekanan pada mata uang negara berkembang.',
    source:'CNBC INDONESIA', publishedAt:minsAgo(30),
    categories:['hot','latest'],
    impactLevel:'medium', aiConfidence:77, views:8200,
    estimatedImpact:[{ticker:'IHSG',low:0.3,high:0.8,direction:'positive',timeframe:'short'}],
    whyRelevant:['Penguatan Rupiah mengurangi risiko capital outflow','Saham importir berpotensi profitabilitas meningkat'],
  },
  {
    id:'n12', tickers:['IHSG','BBCA','BMRI'],
    headline:'OJK Terbitkan Regulasi ESG untuk Perbankan Nasional — Implementasi 2027',
    summary:'OJK mewajibkan seluruh bank nasional dengan aset di atas Rp 100 triliun untuk menerbitkan laporan keberlanjutan (ESG) terstandar mulai 2027, dengan sanksi administratif bagi yang tidak patuh.',
    source:'BISNIS.COM', publishedAt:minsAgo(480),
    categories:['critical'],
    impactLevel:'regulatory', aiConfidence:72, views:5600,
    estimatedImpact:[{ticker:'BBCA',low:-0.3,high:0.2,direction:'neutral',timeframe:'long'}],
    whyRelevant:['Biaya implementasi sistem pelaporan ESG diperkirakan Rp 200-400 miliar','Investor ESG global lebih tertarik pada emiten yang patuh'],
  },
  {
    id:'n13', tickers:['INDF','UNVR','ICBP'],
    headline:'El Niño Perburuk Pasokan Minyak Sawit — Harga CPO Tembus USD 1.180/Ton',
    summary:'Harga minyak sawit mentah (CPO) di Bursa Malaysia melonjak ke USD 1.180/ton setelah laporan BMKG memperkirakan El Niño berlanjut hingga Q2 2026. Produsen CPO Indonesia diperkirakan untung, konsumen rugi.',
    source:'REUTERS ID', publishedAt:minsAgo(720),
    categories:['hot','popular'],
    impactLevel:'high', aiConfidence:84, views:13500,
    estimatedImpact:[{ticker:'INDF',low:-0.8,high:0.5,direction:'neutral',timeframe:'medium'}],
    whyRelevant:['Kenaikan CPO meningkatkan biaya bahan baku FMCG','Sektor perkebunan seperti AALI dan LSIP diuntungkan'],
  },
  {
    id:'n14', tickers:['IHSG','ASII','UNTR'],
    headline:'The Fed Tahan Suku Bunga di 4,25%, Pasar Emerging Market Bereaksi Positif',
    summary:'Federal Reserve AS mempertahankan Fed Funds Rate di 4,25% dengan indikasi 2 kali pemangkasan di sepanjang 2026. Keputusan ini mendorong aliran modal ke pasar berkembang termasuk Indonesia.',
    source:'KONTAN', publishedAt:minsAgo(900),
    categories:['hot','critical'],
    impactLevel:'high', aiConfidence:89, views:19200,
    estimatedImpact:[{ticker:'IHSG',low:0.6,high:1.4,direction:'positive',timeframe:'short'}],
    whyRelevant:['Dovish Fed biasanya positif untuk IHSG dalam 5 hari ke depan','Asing dapat kembali masuk pasar saham Indonesia'],
  },
  {
    id:'n15', tickers:['ASII'],
    headline:'Astra International Laporkan Penjualan Otomotif Turun 8% YoY di Februari 2026',
    summary:'Gabungan Industri Kendaraan Bermotor Indonesia mencatat penjualan mobil turun 8% YoY di Februari 2026 menjadi 78.200 unit, berdampak langsung pada segmen otomotif ASII yang menguasai 54% pangsa pasar.',
    source:'DETIK FINANCE', publishedAt:minsAgo(540),
    categories:['critical','latest'],
    impactLevel:'high', aiConfidence:86, views:10700,
    estimatedImpact:[{ticker:'ASII',low:-1.5,high:-0.5,direction:'negative',timeframe:'short'}],
    whyRelevant:['Penurunan penjualan otomotif Q1 berpotensi tekan EPS 2026','Segmen alat berat dan pertambangan ASII dapat mengimbangi'],
  },
];

// ─────────────────────────────────────────────────────────
// AI AGENT STUB FUNCTIONS (replace with real endpoints in production)
// ─────────────────────────────────────────────────────────

/** Fetch personalized news for the user based on portfolio + watchlist
 * PRODUCTION: POST /api/news/personalized
 * AI responsibilities: scrape IDX sources, classify impact, rank by relevance × recency
 */
export async function fetchPersonalizedNews(watchlistTickers: string[], _portfolioTickers: string[]): Promise<NewsItem[]> {
  await new Promise(r => setTimeout(r, 400));
  return DUMMY_NEWS.filter(n => n.relevanceReason || n.tickers.some(t => watchlistTickers.includes(t)));
}

/** Fetch all news for a specific ticker
 * PRODUCTION: GET /api/news/ticker/:code
 * AI responsibilities: filter direct + indirect mentions, calculate price impact range
 */
export async function fetchNewsByTicker(ticker: string): Promise<NewsItem[]> {
  await new Promise(r => setTimeout(r, 350));
  return DUMMY_NEWS.filter(n => n.tickers.includes(ticker));
}

/** Fetch news by feed category
 * PRODUCTION: GET /api/news/feed?category=hot
 */
export async function fetchNewsByCategory(category: NewsCategory): Promise<NewsItem[]> {
  await new Promise(r => setTimeout(r, 300));
  return DUMMY_NEWS.filter(n => n.categories.includes(category));
}

/** Load more news (infinite scroll)
 * PRODUCTION: GET /api/news/feed?page=N
 */
export async function loadMore(_page: number): Promise<NewsItem[]> {
  await new Promise(r => setTimeout(r, 500));
  return []; // stub: no extra pages in dev
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
const relTime = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'Baru saja';
  if (diff < 60) return `${diff} mnt lalu`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hr lalu`;
};
const isLive = (iso: string) => (Date.now() - new Date(iso).getTime()) < 10 * 60 * 1000;
const confColor = (c: number) => c >= 80 ? SG.accent : c >= 60 ? SG.gold : SG.textMuted;

// ─────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────
const NewsSkeleton = () => (
  <div style={{ padding: '0 16px' }}>
    {[1,2,3].map(i => (
      <div key={i} className="animate-pulse mb-3 rounded-2xl p-4"
        style={{ background: SG.bgSurface, border:`1px solid ${SG.border}` }}>
        <div className="flex gap-2 mb-3">
          <div className="h-4 w-16 rounded-full" style={{ background: SG.bgMuted }} />
          <div className="h-4 w-20 rounded-full" style={{ background: SG.bgMuted }} />
        </div>
        <div className="h-4 w-full rounded mb-2" style={{ background: SG.bgMuted }} />
        <div className="h-4 w-3/4 rounded mb-3" style={{ background: SG.bgMuted }} />
        <div className="h-3 w-5/6 rounded" style={{ background: SG.bgMuted }} />
      </div>
    ))}
  </div>
);

const EmptyState = ({ msg='AI Agent sedang mengumpulkan berita...' }: { msg?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6">
    <div className="w-10 h-10 border-2 rounded-full animate-spin mb-4"
      style={{ borderColor: SG.border, borderTopColor: SG.accent }} />
    <p style={{ color: SG.textMuted, fontFamily: SG.sans, fontSize: 13 }}>{msg}</p>
  </div>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6">
    <p className="mb-3" style={{ color: SG.red, fontFamily: SG.sans, fontSize: 13 }}>
      Gagal memuat berita. Coba lagi.
    </p>
    <button onClick={onRetry} className="px-4 py-2 rounded-xl text-xs font-bold"
      style={{ background: SG.accent, color: SG.bgBase, fontFamily: SG.sans }}>
      Retry
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────
// NEWS CARD COMPONENT
// ─────────────────────────────────────────────────────────
interface NewsCardProps {
  item: NewsItem;
  showRelevance?: boolean;
  showPriceImpact?: boolean;
  activeTicker?: string;
  onTickerClick?: (ticker: string) => void;
  highlightBorder?: boolean;
  extraTopBadge?: React.ReactNode;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  item, showRelevance, showPriceImpact, activeTicker, onTickerClick,
  highlightBorder, extraTopBadge,
}) => {
  const [expanded, setExpanded] = useState(false);
  const impact = IMPACT_TAGS[item.impactLevel];
  const live = isLive(item.publishedAt);
  const priceImpact = activeTicker ? item.estimatedImpact.find(e => e.ticker === activeTicker) : null;

  return (
    <div className="mb-3 rounded-2xl overflow-hidden transition-all"
      style={{
        background: highlightBorder ? 'rgba(239,68,68,0.06)' : SG.bgSurface,
        border: `1px solid ${highlightBorder ? 'rgba(239,68,68,0.18)' : SG.border}`,
        borderLeft: highlightBorder ? `3px solid ${SG.red}` : undefined,
      }}>
      {extraTopBadge && <div className="px-4 pt-3">{extraTopBadge}</div>}
      <div className="p-4">
        {/* Row 1: source | impact | time */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
            style={{ background: SG.bgMuted, color: SG.textMuted, fontFamily: SG.sans }}>
            {item.source}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: impact.bg, color: impact.text, fontFamily: SG.sans }}>
            {impact.label}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {live && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: SG.accent }} />
            )}
            <span style={{ color: SG.textDim, fontSize: 10, fontFamily: SG.sans }}>
              {relTime(item.publishedAt)}
            </span>
          </div>
        </div>

        {/* Headline */}
        <p className="font-bold mb-1.5 line-clamp-2"
          style={{ color: SG.textPrimary, fontFamily: SG.sans, fontSize: 14, lineHeight: 1.45 }}>
          {item.headline}
        </p>

        {/* Summary */}
        <p className="mb-3 line-clamp-2"
          style={{ color: SG.textSecond, fontFamily: SG.sans, fontSize: 12, lineHeight: 1.55 }}>
          {item.summary}
        </p>

        {/* Relevance reason */}
        {showRelevance && item.relevanceReason && (
          <p className="mb-2 italic text-[11px]" style={{ color: SG.accent, fontFamily: SG.sans }}>
            {item.relevanceReason}
          </p>
        )}

        {/* Estimated price impact */}
        {showPriceImpact && priceImpact && (
          <div className="mb-2 px-2.5 py-1.5 rounded-xl flex items-center gap-2"
            style={{ background: SG.bgMuted }}>
            <span style={{ fontFamily: SG.mono, fontSize: 11, color: SG.textMuted }}>
              Estimasi dampak ${activeTicker}:
            </span>
            <span className="font-bold" style={{ fontFamily: SG.mono, fontSize: 11,
              color: priceImpact.direction === 'positive' ? SG.accent : priceImpact.direction === 'negative' ? SG.red : SG.textMuted }}>
              {priceImpact.direction === 'positive' ? '+' : ''}{priceImpact.low.toFixed(1)}%
              {' '}s/d {priceImpact.direction === 'positive' ? '+' : ''}{priceImpact.high.toFixed(1)}%
            </span>
            <span className="text-[9px]" style={{ color: SG.textDim, fontFamily: SG.sans }}>
              [{priceImpact.timeframe} term]
            </span>
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {item.tickers.slice(0,4).map(t => (
              <button key={t} onClick={() => onTickerClick?.(t)}
                className="px-2 py-0.5 rounded text-[10px] font-bold transition-opacity hover:opacity-70"
                style={{ background: SG.bgMuted, color: SG.accent, fontFamily: SG.mono }}>
                ${t}
              </button>
            ))}
          </div>
          <span style={{ color: SG.textDim, fontSize: 10, fontFamily: SG.sans }}>
            👁 {item.views >= 1000 ? `${(item.views/1000).toFixed(1)}k` : item.views}
          </span>
          {/* AI Confidence */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: SG.bgMuted }}>
              <div className="h-full rounded-full transition-all"
                style={{ width:`${item.aiConfidence}%`, background: confColor(item.aiConfidence) }} />
            </div>
            <span style={{ fontFamily: SG.mono, fontSize: 10, color: confColor(item.aiConfidence) }}>
              {item.aiConfidence}%
            </span>
          </div>
        </div>

        {/* "Kenapa relevan?" expandable (for panel) */}
        {showPriceImpact && item.whyRelevant.length > 0 && (
          <div className="mt-2">
            <button onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-bold flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: SG.textMuted, fontFamily: SG.sans }}>
              {expanded ? '▲' : '▼'} Kenapa berita ini relevan?
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1">
                {item.whyRelevant.map((r,i) => (
                  <li key={i} className="text-[11px] flex gap-1.5"
                    style={{ color: SG.textSecond, fontFamily: SG.sans }}>
                    <span style={{ color: SG.accent, flexShrink: 0 }}>•</span>{r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// NEWS PAGE COMPONENT
// ─────────────────────────────────────────────────────────
const TABS = [
  { id:'personalized', label:'📡 My News' },
  { id:'hot',          label:'🔥 Hot'     },
  { id:'latest',       label:'🕐 Terbaru' },
  { id:'critical',     label:'⚠️ Critical'},
  { id:'popular',      label:'👁 Terpopuler'},
] as const;

const FILTER_CHIPS = ['Semua','Saham','Makro','Regulasi','Politik','Korporasi','Global'];

interface NewsPageProps {
  onTickerClick?: (ticker: string) => void;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onTickerClick }) => {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('personalized');
  const [filterChip, setFilterChip] = useState('Semua');
  const [loading] = useState(false);

  const WATCHLIST = ['BBCA','TLKM','GOTO','BBRI','ASII'];

  const filterByChip = useCallback((news: NewsItem[]) => {
    if (filterChip === 'Semua') return news;
    const chipMap: Record<string, string[]> = {
      Saham:['BBCA','GOTO','TLKM','BBRI','ASII','INDF','UNVR'],
      Makro:['IHSG'], Regulasi:[], Politik:[], Korporasi:[], Global:[],
    };
    const chTickers = chipMap[filterChip] ?? [];
    return news.filter(n => chTickers.some(t => n.tickers.includes(t)) ||
      (filterChip === 'Regulasi' && n.impactLevel === 'regulatory') ||
      (filterChip === 'Global' && ['REUTERS ID'].includes(n.source))
    );
  }, [filterChip]);

  const getNews = useCallback(() => {
    const base = filterByChip(DUMMY_NEWS);
    if (tab === 'personalized') return base.filter(n => WATCHLIST.some(t => n.tickers.includes(t))).slice(0,8);
    if (tab === 'hot')          return base.filter(n => n.categories.includes('hot'));
    if (tab === 'latest')       return base.sort((a,b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    if (tab === 'critical')     return base.filter(n => ['breaking','high'].includes(n.impactLevel));
    if (tab === 'popular')      return [...base].sort((a,b) => b.views - a.views);
    return base;
  }, [tab, filterByChip]);

  const news = getNews();

  return (
    <div className="pb-24 animate-fade-in" style={{ background: SG.bgBase, minHeight: '100vh' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30" style={{ background: SG.bgHeader, borderBottom:`1px solid ${SG.border}` }}>
        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-black text-lg leading-tight" style={{ color: SG.textPrimary, fontFamily: SG.sans }}>
              Berita & Analisis
            </h1>
            <p className="text-[11px] font-semibold" style={{ color: SG.accent, fontFamily: SG.sans }}>
              ✦ Ditenagai AI Agent
            </p>
          </div>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: SG.bgMuted }}>
            <span style={{ fontSize: 18 }}>🔍</span>
          </button>
        </div>

        {/* Tab row */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-2 pb-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={{
                background: tab === t.id ? SG.accent : SG.bgMuted,
                color: tab === t.id ? SG.bgBase : SG.textMuted,
                fontFamily: SG.sans,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-2 pb-3">
          {FILTER_CHIPS.map(c => (
            <button key={c} onClick={() => setFilterChip(c)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
              style={{
                background: filterChip === c ? `${SG.accent}22` : 'transparent',
                color: filterChip === c ? SG.accent : SG.textDim,
                border: `1px solid ${filterChip === c ? SG.accent : SG.border}`,
                fontFamily: SG.sans,
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? <NewsSkeleton /> : news.length === 0 ? <EmptyState /> : (

          tab === 'personalized' ? (
            <>
              {/* My Billboard header */}
              <div className="rounded-2xl p-3 mb-4 flex items-start gap-2"
                style={{ background: `${SG.accent}15`, border:`1px solid ${SG.accent}30` }}>
                <span style={{ fontSize: 18 }}>📡</span>
                <div>
                  <p className="font-bold text-[12px]" style={{ color: SG.textPrimary, fontFamily: SG.sans }}>
                    Dipersonalisasi untuk portofolio & watchlist kamu
                  </p>
                  <p className="text-[10px]" style={{ color: SG.textMuted, fontFamily: SG.sans }}>
                    Diperbarui oleh AI Agent • 5 mnt lalu
                  </p>
                </div>
              </div>
              {news.map(n => (
                <NewsCard key={n.id} item={n} showRelevance onTickerClick={onTickerClick} />
              ))}
            </>
          ) : tab === 'hot' ? (
            <>
              {/* Trending Now highlight */}
              <p className="font-black text-sm mb-3" style={{ color: SG.textPrimary, fontFamily: SG.sans }}>
                🔥 Trending Sekarang
              </p>
              {news.slice(0,3).map(n => (
                <NewsCard key={n.id} item={n} highlightBorder onTickerClick={onTickerClick} />
              ))}
              {news.slice(3).map(n => (
                <NewsCard key={n.id} item={n} onTickerClick={onTickerClick} />
              ))}
            </>
          ) : tab === 'critical' ? (
            <>
              {/* Warning banner */}
              <div className="rounded-2xl p-3 mb-4" style={{ background:'rgba(239,68,68,0.08)', border:`1px solid rgba(239,68,68,0.2)` }}>
                <p className="font-bold text-[12px]" style={{ color: SG.red, fontFamily: SG.sans }}>
                  ⚠️ Berita Kritis — Dapat Mempengaruhi Portofolio Kamu
                </p>
              </div>
              {news.map(n => (
                <NewsCard key={n.id} item={n} highlightBorder showPriceImpact
                  activeTicker={WATCHLIST.find(t => n.tickers.includes(t))}
                  onTickerClick={onTickerClick} />
              ))}
            </>
          ) : tab === 'popular' ? (
            news.map((n, i) => (
              <NewsCard key={n.id} item={n} onTickerClick={onTickerClick}
                extraTopBadge={i < 3 ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: SG.gold, color: SG.bgBase, fontFamily: SG.sans }}>
                    🏆 #{i+1} minggu ini
                  </span>
                ) : undefined}
              />
            ))
          ) : (
            news.map(n => <NewsCard key={n.id} item={n} onTickerClick={onTickerClick} />)
          )
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// TICKER NEWS PANEL — drop-in for Market Analysis right panel
// ─────────────────────────────────────────────────────────
interface TickerNewsPanelProps {
  ticker: string;
  onTickerClick?: (ticker: string) => void;
  onViewAll?: (ticker: string) => void;
}

export const TickerNewsPanel: React.FC<TickerNewsPanelProps> = ({
  ticker, onTickerClick, onViewAll,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);

  React.useEffect(() => {
    setLoading(true); setError(false);
    fetchNewsByTicker(ticker)
      .then(d => { setNews(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [ticker]);

  return (
    <div className="h-full flex flex-col" style={{ background: SG.bgBase }}>
      {/* Panel header */}
      <div className="px-4 py-3 flex-shrink-0"
        style={{ background: SG.bgHeader, borderBottom:`1px solid ${SG.border}` }}>
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-black text-sm" style={{ color: SG.textPrimary, fontFamily: SG.sans }}>
            📰 Latest News
          </p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: `${SG.accent}20`, color: SG.accent, fontFamily: SG.mono }}>
              ${ticker}
            </span>
            <button onClick={() => { setLoading(true); fetchNewsByTicker(ticker).then(d=>{setNews(d);setLoading(false);}); }}
              style={{ color: SG.textMuted, fontSize: 14 }}>🔄</button>
          </div>
        </div>
        <p className="text-[10px]" style={{ color: SG.textMuted, fontFamily: SG.sans }}>
          Difilter AI Agent untuk ${ticker}
        </p>
      </div>

      {/* News list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? <NewsSkeleton /> :
         error   ? <ErrorState onRetry={() => { setLoading(true); fetchNewsByTicker(ticker).then(d=>{setNews(d);setLoading(false);}).catch(()=>setError(true)); }} /> :
         news.length === 0 ? <EmptyState msg={`Belum ada berita untuk $${ticker}`} /> :
         news.map(n => (
           <NewsCard key={n.id} item={n}
             showPriceImpact activeTicker={ticker}
             onTickerClick={onTickerClick} />
         ))
        }
      </div>

      {/* Footer */}
      {news.length > 0 && (
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop:`1px solid ${SG.border}` }}>
          <button onClick={() => onViewAll?.(ticker)}
            className="w-full py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
            style={{ background: `${SG.accent}18`, color: SG.accent, fontFamily: SG.sans }}>
            Lihat semua berita ${ticker} →
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
