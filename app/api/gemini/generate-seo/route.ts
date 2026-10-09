import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { action, websiteContext, pageData, issueData } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const brand = websiteContext?.businessName || websiteContext?.name || 'Arthur’s Creatives';
    const services = websiteContext?.primaryServices || 'Creative, web design, and digital growth services';
    const audience = websiteContext?.targetAudience || 'Modern businesses and local clients';
    const city = websiteContext?.primaryCity ? `${websiteContext.primaryCity}, ${websiteContext.country || 'US'}` : 'Global';

    if (action === 'generate_metadata') {
      const pageUrl = pageData?.url || '/';
      const existingTitle = pageData?.title || 'None';
      const existingH1 = pageData?.h1 || 'None';
      const targetKeyword = pageData?.targetKeyword || services.split(',')[0] || 'Digital Services';

      const prompt = `You are a world-class SEO specialist writing metadata for:
Business: "${brand}"
Services: "${services}"
Location: "${city}"
Page URL: "${pageUrl}"
Current Title: "${existingTitle}"
Current H1: "${existingH1}"
Target Focus Keyword: "${targetKeyword}"

Instructions:
1. Propose an optimized Page Title (must strictly be between 50 and 60 characters, compelling, human-first, no keyword stuffing, includes brand or location appropriately).
2. Propose an optimized Meta Description (must strictly be between 135 and 155 characters, clear benefit, natural language, active call-to-action).
3. Provide a brief 1-2 sentence rationale explaining why this improves CTR without compromising brand voice.

Respond ONLY with valid JSON in this exact structure:
{
  "proposedTitle": "...",
  "titleLength": 54,
  "proposedMetaDescription": "...",
  "metaLength": 145,
  "rationale": "...",
  "primaryKeywordUsed": "..."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json({ success: true, data: parsed });
    }

    if (action === 'generate_schema') {
      const pageUrl = pageData?.url || 'https://arthurscreatives.com';
      const schemaType = pageData?.schemaType || 'LocalBusiness';

      const prompt = `You are an expert technical SEO specialist generating valid Schema.org JSON-LD.
Business: "${brand}"
Description: "${websiteContext?.businessDescription || services}"
URL: "${pageUrl}"
Location: "${city}"
Requested Schema Type: "${schemaType}"

Generate a clean, strictly valid Schema.org JSON-LD object for this business.
Ensure:
- Valid @context ("https://schema.org")
- Proper @type
- Realistic placeholders or verified details for name, url, description, address/areaServed if local.

Respond ONLY with valid JSON in this exact format:
{
  "schemaType": "${schemaType}",
  "jsonLdString": "...",
  "validationNotes": "Valid Schema.org compliant representation",
  "implementationGuide": "Place inside a <script type=\\"application/ld+json\\"> tag inside your <head> or footer."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '{}');
      // Validate that jsonLdString is syntactically valid JSON
      try {
        if (typeof parsed.jsonLdString === 'string') {
          JSON.parse(parsed.jsonLdString);
        }
      } catch {
        // Fallback standard structure if stringified nested json had formatting glitch
        parsed.jsonLdString = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': schemaType,
          name: brand,
          url: pageUrl,
          description: services,
        }, null, 2);
      }

      return NextResponse.json({ success: true, data: parsed });
    }

    if (action === 'explain_issue') {
      const issueTitle = issueData?.title || 'SEO Issue';
      const issueSeverity = issueData?.severity || 'warning';
      const issueCategory = issueData?.category || 'technical';
      const affectedCount = issueData?.affectedPagesCount || 1;

      const prompt = `You are a senior technical SEO auditor communicating with a client.
Issue: "${issueTitle}"
Severity: "${issueSeverity}"
Category: "${issueCategory}"
Affected Pages: ${affectedCount}

Provide:
1. Plain-English summary of what this issue is (for a non-technical business owner).
2. Why search engines like Google penalize or devalue this.
3. Step-by-step concrete instructions for how Arthur or his team can fix it manually in a website editor (Duda, WordPress, custom code).
4. Estimated business impact (low, medium, high) and effort required.

Respond ONLY with valid JSON:
{
  "plainExplanation": "...",
  "searchEngineImpact": "...",
  "fixSteps": ["Step 1...", "Step 2...", "Step 3..."],
  "codeSnippet": "...",
  "estimatedImpact": "...",
  "estimatedEffort": "..."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json({ success: true, data: parsed });
    }

    if (action === 'generate_action_plan') {
      const prompt = `You are Arthur Rattray's Chief SEO Strategist.
Business: "${brand}"
Services: "${services}"
Target Market: "${city}"
Audience: "${audience}"

Given that we want a focused, high-leverage 30-day SEO action plan (limiting active execution to 2 high-impact items at a time):
Create 4 prioritized phases (Weeks 1 through 4) with 2 concrete, measurable tasks each.
Categories to cover:
1. Technical & Indexing Foundations
2. Core Landing Page Optimization (Title, H1, Meta, Copy)
3. Local Authority & Schema Markup
4. Content Expansion & Internal Link Architecture

Respond ONLY with valid JSON:
{
  "planTitle": "30-Day High-Impact SEO Sprint for ${brand}",
  "weeklyPhases": [
    {
      "week": 1,
      "title": "Technical Hygiene & Crawl Optimization",
      "tasks": [
        { "title": "...", "description": "...", "priority": "high", "expectedBenefit": "..." },
        { "title": "...", "description": "...", "priority": "high", "expectedBenefit": "..." }
      ]
    },
    {
      "week": 2,
      "title": "Core Page Keyword & Semantic Alignment",
      "tasks": [
        { "title": "...", "description": "...", "priority": "high", "expectedBenefit": "..." },
        { "title": "...", "description": "...", "priority": "medium", "expectedBenefit": "..." }
      ]
    },
    {
      "week": 3,
      "title": "Rich Snippets & Structured Data Implementation",
      "tasks": [
        { "title": "...", "description": "...", "priority": "medium", "expectedBenefit": "..." },
        { "title": "...", "description": "...", "priority": "medium", "expectedBenefit": "..." }
      ]
    },
    {
      "week": 4,
      "title": "Internal Linking & Content Depth Expansion",
      "tasks": [
        { "title": "...", "description": "...", "priority": "medium", "expectedBenefit": "..." },
        { "title": "...", "description": "...", "priority": "low", "expectedBenefit": "..." }
      ]
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json({ success: true, data: parsed });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Gemini SEO error:', err);
    return NextResponse.json({ error: err.message || 'Gemini processing failed' }, { status: 500 });
  }
}
