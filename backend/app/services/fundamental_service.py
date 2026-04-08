"""
Fundamental Analysis Service

Generates fundamental analysis data and investment verdicts.
Supports both mock data (for development) and real data sources (for production).
"""

from typing import Dict, Any
import random
import json
import os
from datetime import datetime

from ..schemas.analysis import (
    QuantitativeAnalysis,
    AnalysisApproach
)
from ..config import get_settings
from ..services.genai_client import async_generate_content, response_text


# Sector-based fundamental ranges for realistic mock data
SECTOR_FUNDAMENTALS = {
    "Banking": {
        "pe_range": (8, 15),
        "pbv_range": (1.2, 2.5),
        "roe_range": (10, 18),
        "der_range": (4, 8),
        "div_yield_range": (3, 6)
    },
    "Consumer": {
        "pe_range": (15, 30),
        "pbv_range": (3, 8),
        "roe_range": (15, 35),
        "der_range": (0.3, 1.5),
        "div_yield_range": (2, 5)
    },
    "Technology": {
        "pe_range": (20, 50),
        "pbv_range": (4, 12),
        "roe_range": (12, 30),
        "der_range": (0.2, 1.0),
        "div_yield_range": (0.5, 2)
    },
    "Mining": {
        "pe_range": (5, 12),
        "pbv_range": (1, 3),
        "roe_range": (8, 20),
        "der_range": (0.5, 2),
        "div_yield_range": (4, 8)
    },
    "Infrastructure": {
        "pe_range": (10, 20),
        "pbv_range": (1.5, 3.5),
        "roe_range": (8, 15),
        "der_range": (1.5, 4),
        "div_yield_range": (3, 6)
    },
    "Default": {
        "pe_range": (10, 25),
        "pbv_range": (1.5, 4),
        "roe_range": (10, 20),
        "der_range": (0.5, 2.5),
        "div_yield_range": (2, 5)
    }
}

OVERRIDE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "overrides")

def load_manual_override(ticker: str) -> Dict[str, Any]:
    """Load manual override data if it exists."""
    file_path = os.path.join(OVERRIDE_DIR, f"{ticker}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading manual override for {ticker}: {e}")
    return None


def generate_mock_fundamentals(ticker: str, sector: str = "Default") -> FundamentalData:
    """
    Generate realistic mock fundamental data based on sector.
    
    Args:
        ticker: Stock ticker symbol
        sector: Company sector (Banking, Consumer, Technology, etc.)
        
    Returns:
        FundamentalData object with realistic values
    """
    # Check for manual override
    override = load_manual_override(ticker)
    if override and "fundamentals" in override:
        return FundamentalData(**override["fundamentals"])

    # Get sector ranges or use default
    ranges = SECTOR_FUNDAMENTALS.get(sector, SECTOR_FUNDAMENTALS["Default"])
    
    # Use ticker hash for consistent values across calls
    seed = sum(ord(c) for c in ticker)
    random.seed(seed)
    
    # Generate values within sector ranges
    pe_ratio = round(random.uniform(*ranges["pe_range"]), 2)
    pbv_ratio = round(random.uniform(*ranges["pbv_range"]), 2)
    roe = round(random.uniform(*ranges["roe_range"]), 2)
    der = round(random.uniform(*ranges["der_range"]), 2)
    dividend_yield = round(random.uniform(*ranges["div_yield_range"]), 2)
    
    # Generate market cap based on sector and ticker
    market_cap_base = random.uniform(5, 200)  # Trillion IDR
    market_cap = f"{market_cap_base:.1f}T IDR"
    
    return FundamentalData(
        pe_ratio=pe_ratio,
        pbv_ratio=pbv_ratio,
        roe=roe,
        der=der,
        market_cap=market_cap,
        dividend_yield=dividend_yield
    )


def generate_investment_verdict(
    ticker: str,
    fundamentals: FundamentalData,
    signal: SignalType,
    confidence: float,
    sector: str = "Default"
) -> InvestmentVerdict:
    """
    Generate investment verdict based on fundamental and technical analysis.
    
    Args:
        ticker: Stock ticker symbol
        fundamentals: Fundamental data
        signal: Technical signal (BUY, SELL, etc.)
        confidence: Signal confidence (0-100)
        sector: Company sector
        
    Returns:
        InvestmentVerdict with rating, suitability, pros, and cons
    """
    # Determine rating based on signal and fundamentals
    if signal in [SignalType.STRONG_BUY, SignalType.BUY]:
        if fundamentals.roe > 15 and fundamentals.der < 2:
            rating = "Buy"
        elif fundamentals.roe > 10:
            rating = "Buy"
        else:
            rating = "Hold"
    elif signal == SignalType.NEUTRAL:
        rating = "Hold"
    else:
        rating = "Sell"
    
    # Calculate suitability scores (0-100)
    growth_score = min(100, int((fundamentals.roe / 30) * 100))
    value_score = min(100, int((1 / max(0.1, fundamentals.pbv_ratio)) * 100))
    dividend_score = min(100, int((fundamentals.dividend_yield / 8) * 100))
    
    suitability = {
        "growth": growth_score,
        "value": value_score,
        "dividend": dividend_score
    }
    
    # Generate pros based on fundamentals
    pros = []
    if fundamentals.roe > 15:
        pros.append(f"Strong ROE of {fundamentals.roe}% indicates efficient operations")
    if fundamentals.der < 1:
        pros.append(f"Low debt-to-equity ratio ({fundamentals.der}x) shows financial stability")
    if fundamentals.dividend_yield > 4:
        pros.append(f"Attractive dividend yield of {fundamentals.dividend_yield}%")
    if fundamentals.pe_ratio < 15:
        pros.append(f"Reasonable P/E ratio of {fundamentals.pe_ratio}x suggests fair valuation")
    if signal in [SignalType.STRONG_BUY, SignalType.BUY]:
        pros.append(f"Technical analysis shows {signal.value} signal with {confidence}% confidence")
    
    # Generate cons based on fundamentals
    cons = []
    if fundamentals.roe < 10:
        cons.append(f"Below-average ROE of {fundamentals.roe}% may indicate operational challenges")
    if fundamentals.der > 2:
        cons.append(f"High debt-to-equity ratio ({fundamentals.der}x) poses financial risk")
    if fundamentals.pe_ratio > 25:
        cons.append(f"High P/E ratio of {fundamentals.pe_ratio}x suggests potential overvaluation")
    if fundamentals.dividend_yield < 2:
        cons.append(f"Low dividend yield of {fundamentals.dividend_yield}% for income investors")
    if signal in [SignalType.SELL, SignalType.STRONG_SELL]:
        cons.append(f"Technical analysis shows {signal.value} signal")
    
    # Ensure at least 2 pros and 2 cons
    if len(pros) < 2:
        pros.append(f"Market cap of {fundamentals.market_cap} provides liquidity")
    if len(cons) < 2:
        cons.append("Market volatility may affect short-term performance")
    
    return InvestmentVerdict(
        rating=rating,
        suitability=suitability,
        pros=pros[:5],  # Limit to top 5
        cons=cons[:5]   # Limit to top 5
    )


# Production-ready function for real data integration
async def fetch_real_fundamentals_with_ai(ticker: str) -> Dict[str, Any]:
    """
    Fetch comprehensive fundamental analysis using Gemini AI with Google Search.
    Returns a dictionary containing 'fundamentals', 'qualitative', 'quantitative', and 'approach'.
    """
    settings = get_settings()
    
    if not settings.GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found. Using mock data.")
        return None

    try:
        prompt = f"""
        Act as a professional financial analyst. Perform a comprehensive fundamental analysis for {ticker} (Indonesia Stock Exchange).
        Use Google Search to find the latest financial data (2024/2025).
        
        Return a valid JSON object with the following structure (do not include markdown formatting):
        {{
            "fundamentals": {{
                "pe_ratio": float, "pbv_ratio": float, "roe": float, "der": float,
                "dividend_yield": float, "market_cap": "string (e.g. 500T IDR)"
            }},
            "qualitative": {{
                "business_model": "string", "management_quality": "string",
                "industry_prospects": "string", "competitive_position": "string"
            }},
            "quantitative": {{
                "income_statement": {{ "revenue_growth_yoy": "string%", "net_margin": "string%", ... }},
                "balance_sheet": {{ "current_ratio": "string x", "debt_to_equity": "string x", ... }},
                "cash_flow": {{ "operating_cf_margin": "string%", "free_cf_yield": "string%", ... }}
            }},
            "approach": {{
                "methodology": "Top-Down" or "Bottom-Up",
                "description": "string",
                "key_factors": ["string", "string", "string"]
            }}
        }}
        """

        response = await async_generate_content(
            model="gemini-2.0-flash",
            prompt=prompt,
            response_mime_type="application/json",
            use_google_search=True,
        )
        
        # Clean response text (remove markdown code blocks if present)
        text = response_text(response).replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        
        # Parse into Pydantic models to validate
        return {
            "fundamentals": FundamentalData(**data["fundamentals"]),
            "qualitative": QualitativeAnalysis(**data["qualitative"]),
            "quantitative": QuantitativeAnalysis(**data["quantitative"]),
            "approach": AnalysisApproach(**data["approach"])
        }
        
    except Exception as e:
        print(f"Error fetching real fundamentals for {ticker}: {e}")
        return None


def generate_qualitative_analysis(ticker: str, sector: str = "Default") -> QualitativeAnalysis:
    """
    Generate qualitative fundamental analysis based on sector.
    
    Args:
        ticker: Stock ticker symbol
        sector: Company sector
        
    Returns:
        QualitativeAnalysis with business model, management, industry, and competitive position
    """
    # Check for manual override
    override = load_manual_override(ticker)
    if override and "qualitative" in override:
        return QualitativeAnalysis(**override["qualitative"])

    # Sector-specific qualitative insights
    sector_insights = {
        "Banking": {
            "business_model": "Diversified banking services including retail, corporate, and investment banking. Revenue from net interest margin, fees, and trading.",
            "management": "Experienced management team with strong track record in risk management and digital transformation initiatives.",
            "industry": "Indonesian banking sector showing steady growth driven by financial inclusion and digital adoption. Regulatory environment supportive of consolidation.",
            "competitive": "Strong market position with extensive branch network and growing digital presence. Brand recognition provides competitive moat."
        },
        "Consumer": {
            "business_model": "Consumer goods manufacturer with diverse product portfolio. Revenue from direct sales and distribution partnerships across Indonesia.",
            "management": "Professional management with focus on innovation and market expansion. Strong corporate governance practices.",
            "industry": "Consumer sector benefits from rising middle class and urbanization. E-commerce growth creating new distribution channels.",
            "competitive": "Market leader with strong brand equity and distribution network. Economies of scale provide cost advantages."
        },
        "Technology": {
            "business_model": "Technology platform generating revenue from subscriptions, transactions, and advertising. Focus on network effects and user growth.",
            "management": "Founder-led with strong technical expertise. Agile decision-making and innovation culture.",
            "industry": "Digital economy rapidly expanding in Indonesia. Government support for technology adoption and startup ecosystem.",
            "competitive": "First-mover advantage in key segments. Strong user base and data moat creating barriers to entry."
        },
        "Mining": {
            "business_model": "Natural resource extraction and processing. Revenue tied to commodity prices and production volumes.",
            "management": "Experienced in operational efficiency and sustainability practices. Focus on cost control and ESG compliance.",
            "industry": "Commodity demand driven by global economic growth and energy transition. Price volatility remains key risk.",
            "competitive": "Low-cost producer with strategic reserves. Long-term contracts provide revenue stability."
        },
        "Infrastructure": {
            "business_model": "Infrastructure development and operation. Stable revenue from long-term concessions and government contracts.",
            "management": "Strong project execution capabilities and stakeholder management. Focus on sustainable infrastructure.",
            "industry": "Government infrastructure spending driving sector growth. Public-private partnerships creating opportunities.",
            "competitive": "Established relationships with government and proven track record. Regulatory barriers protect market position."
        },
        "Default": {
            "business_model": "Diversified business model with multiple revenue streams. Focus on operational efficiency and market expansion.",
            "management": "Professional management team with industry experience. Commitment to shareholder value creation.",
            "industry": "Industry showing moderate growth with evolving competitive dynamics. Regulatory environment generally supportive.",
            "competitive": "Solid market position with recognized brand. Continuous improvement in operational capabilities."
        }
    }
    
    insights = sector_insights.get(sector, sector_insights["Default"])
    
    return QualitativeAnalysis(
        business_model=insights["business_model"],
        management_quality=insights["management"],
        industry_prospects=insights["industry"],
        competitive_position=insights["competitive"]
    )


def generate_quantitative_analysis(ticker: str, fundamentals: FundamentalData, sector: str = "Default") -> QuantitativeAnalysis:
    """
    Generate quantitative financial analysis.
    
    Args:
        ticker: Stock ticker symbol
        fundamentals: Fundamental data
        sector: Company sector
        
    Returns:
        QuantitativeAnalysis with income statement, balance sheet, and cash flow metrics
    """
    # Check for manual override
    override = load_manual_override(ticker)
    if override and "quantitative" in override:
        return QuantitativeAnalysis(**override["quantitative"])

    seed = sum(ord(c) for c in ticker)
    random.seed(seed)
    
    # Income Statement
    revenue_growth = round(random.uniform(5, 25), 1)
    gross_margin = round(random.uniform(25, 60), 1)
    operating_margin = round(random.uniform(10, 35), 1)
    net_margin = round(random.uniform(8, 25), 1)
    eps_growth = round(random.uniform(-5, 30), 1)
    
    income_statement = {
        "revenue_growth_yoy": f"{revenue_growth}%",
        "gross_margin": f"{gross_margin}%",
        "operating_margin": f"{operating_margin}%",
        "net_margin": f"{net_margin}%",
        "eps_growth": f"{eps_growth}%"
    }
    
    # Balance Sheet
    current_ratio = round(random.uniform(1.0, 3.0), 2)
    quick_ratio = round(random.uniform(0.8, 2.5), 2)
    debt_to_equity = fundamentals.der
    asset_turnover = round(random.uniform(0.5, 2.0), 2)
    
    balance_sheet = {
        "current_ratio": f"{current_ratio}x",
        "quick_ratio": f"{quick_ratio}x",
        "debt_to_equity": f"{debt_to_equity}x",
        "asset_turnover": f"{asset_turnover}x",
        "roe": f"{fundamentals.roe}%"
    }
    
    # Cash Flow
    operating_cf_margin = round(random.uniform(10, 30), 1)
    free_cf_yield = round(random.uniform(3, 12), 1)
    cf_to_debt = round(random.uniform(0.1, 0.5), 2)
    
    cash_flow = {
        "operating_cf_margin": f"{operating_cf_margin}%",
        "free_cf_yield": f"{free_cf_yield}%",
        "cf_to_debt_ratio": f"{cf_to_debt}x",
        "capex_to_revenue": f"{round(random.uniform(3, 15), 1)}%"
    }
    
    return QuantitativeAnalysis(
        income_statement=income_statement,
        balance_sheet=balance_sheet,
        cash_flow=cash_flow
    )


def generate_analysis_approach(ticker: str, sector: str = "Default") -> AnalysisApproach:
    """
    Generate analysis approach explanation.
    
    Args:
        ticker: Stock ticker symbol
        sector: Company sector
        
    Returns:
        AnalysisApproach with methodology and key factors
    """
    # Check for manual override
    override = load_manual_override(ticker)
    if override and "approach" in override:
        return AnalysisApproach(**override["approach"])

    # Determine methodology based on sector
    if sector in ["Banking", "Infrastructure"]:
        methodology = "Top-Down"
        description = "Analysis starts with macroeconomic trends and sector outlook, then narrows to company-specific factors. Focus on regulatory environment and economic cycles."
        key_factors = [
            "GDP growth and interest rate trends",
            "Sector regulatory changes and policy support",
            "Market share and competitive positioning",
            "Management execution and capital allocation"
        ]
    else:
        methodology = "Bottom-Up"
        description = "Analysis focuses on company-specific fundamentals including business model, competitive advantages, and financial health. Less emphasis on macro factors."
        key_factors = [
            "Business model sustainability and moat",
            "Revenue growth and profitability trends",
            "Balance sheet strength and cash generation",
            "Management quality and corporate governance"
        ]
    
    return AnalysisApproach(
        methodology=methodology,
        description=description,
        key_factors=key_factors
    )
