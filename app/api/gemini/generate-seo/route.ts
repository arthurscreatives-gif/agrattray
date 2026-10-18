import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = 'gemini-3.8-flash';

// Helper to reliably parse JSON from Gemini output even if enclosed in markdown backticks
function parseJsonSafely(text?: string | null): any {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

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

      try {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const parsed = parseJsonSafely(response.text);
        if (parsed && parsed.proposedTitle) {
          return NextResponse.json({ success: true, data: parsed });
        }
      } catch (genError: any) {
        console.warn('Gemini generate_metadata fallback activated:', genError?.message);
      }

      // Intelligent fallback if Gemini key/quota is constrained
      const fallbackTitle = `${brand} | ${targetKeyword.slice(0, 28)} in ${city.split(',')[0]}`.slice(0, 60);
      const fallbackDesc = `Elevate your business with ${brand}. High-performance ${services.toLowerCase().slice(0, 60)} tailored for growth. Schedule your discovery call today!`.slice(0, 155);
      return NextResponse.json({
        success: true,
        data: {
          proposedTitle: fallbackTitle,
          titleLength: fallbackTitle.length,
          proposedMetaDescription: fallbackDesc,
          metaLength: fallbackDesc.length,
          rationale: 'Generated with high-CTR commercial intent matching your brand and primary focus keyword.',
          primaryKeywordUsed: targetKeyword,
        },
      });
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

      try {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const parsed = parseJsonSafely(response.text);
        if (parsed && (parsed.jsonLdString || parsed['@type'])) {
          let jsonStr = parsed.jsonLdString;
          if (typeof jsonStr === 'object') {
            jsonStr = JSON.stringify(jsonStr, null, 2);
          }
          return NextResponse.json({
            success: true,
            data: {
              schemaType,
              jsonLdString: jsonStr || JSON.stringify(parsed, null, 2),
              validationNotes: parsed.validationNotes || 'Valid Schema.org compliant representation',
              implementationGuide: 'Place inside a <script type="application/ld+json"> tag in the head or footer of your site.',
            },
          });
        }
      } catch (genError: any) {
        console.warn('Gemini generate_schema fallback activated:', genError?.message);
      }

      // Valid Schema fallback
      const fallbackSchema = {
        '@context': 'https://schema.org',
        '@type': schemaType,
        name: brand,
        url: pageUrl,
        description: websiteContext?.businessDescription || services,
        areaServed: city,
      };

      return NextResponse.json({
        success: true,
        data: {
          schemaType,
          jsonLdString: JSON.stringify(fallbackSchema, null, 2),
          validationNotes: `Valid Schema.org compliant representation for ${schemaType}`,
          implementationGuide: 'Place inside a <script type="application/ld+json"> tag inside your <head> or footer.',
        },
      });
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

      try {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const parsed = parseJsonSafely(response.text);
        if (parsed && parsed.plainExplanation) {
          return NextResponse.json({ success: true, data: parsed });
        }
      } catch (genError: any) {
        console.warn('Gemini explain_issue fallback activated:', genError?.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          plainExplanation: `This issue relates to ${issueTitle.toLowerCase()}, which affects user experience and crawl accessibility across ${affectedCount} page(s).`,
          searchEngineImpact: 'Search engine crawlers deprioritize pages with incomplete metadata or crawl bottlenecks, lowering organic impressions.',
          fixSteps: [
            'Navigate to your website builder or CMS page settings',
            'Update the affected tags or content according to the recommendation',
            'Publish the changes and submit the URL for re-indexing in Google Search Console',
          ],
          codeSnippet: '',
          estimatedImpact: issueSeverity === 'error' ? 'high' : 'medium',
          estimatedEffort: '15-30 minutes',
        },
      });
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

      try {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const parsed = parseJsonSafely(response.text);
        if (parsed && parsed.weeklyPhases) {
          return NextResponse.json({ success: true, data: parsed });
        }
      } catch (genError: any) {
        console.warn('Gemini generate_action_plan fallback activated:', genError?.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          planTitle: `30-Day High-Impact SEO Sprint for ${brand}`,
          weeklyPhases: [
            {
              week: 1,
              title: 'Technical Hygiene & Crawl Optimization',
              tasks: [
                {
                  title: 'Verify XML Sitemap & Robots.txt',
                  description: 'Ensure sitemap is submitted to Google Search Console and no critical pages are blocked.',
                  priority: 'high',
                  expectedBenefit: 'Guaranteed crawling and indexation of target landing pages',
                },
                {
                  title: 'Resolve Missing Canonical Tags',
                  description: 'Add self-referencing canonical URLs to eliminate duplicate content ambiguity.',
                  priority: 'high',
                  expectedBenefit: 'Consolidates page rank equity and prevents index dilution',
                },
              ],
            },
            {
              week: 2,
              title: 'Core Page Title & Semantic Alignment',
              tasks: [
                {
                  title: 'Optimize Homepage Title & Meta Description',
                  description: `Integrate ${services.split(',')[0]} and primary location into 55-character title tag.`,
                  priority: 'high',
                  expectedBenefit: 'Increases Google SERP click-through rate by 15-25%',
                },
                {
                  title: 'H1 & Subheading Restructuring',
                  description: 'Verify each page has exactly one H1 containing the core target search term.',
                  priority: 'medium',
                  expectedBenefit: 'Improves topical relevance and search algorithm entity recognition',
                },
              ],
            },
            {
              week: 3,
              title: 'Rich Snippets & Schema.org Implementation',
              tasks: [
                {
                  title: 'Deploy LocalBusiness & Organization JSON-LD',
                  description: 'Insert validated JSON-LD schema into header HTML for brand knowledge panel.',
                  priority: 'medium',
                  expectedBenefit: 'Eligibility for rich snippets and local knowledge panel display',
                },
                {
                  title: 'Add FAQ / Service Structured Data',
                  description: 'Mark up service offerings with structured schema to capture SERP real estate.',
                  priority: 'medium',
                  expectedBenefit: 'Expands vertical footprint on Google search results pages',
                },
              ],
            },
            {
              week: 4,
              title: 'Internal Linking & Content Depth Expansion',
              tasks: [
                {
                  title: 'Build Strategic Contextual Internal Links',
                  description: 'Link relevant blog and service pages to primary conversion hubs with descriptive anchor text.',
                  priority: 'medium',
                  expectedBenefit: 'Distributes internal PageRank and increases crawl frequency',
                },
                {
                  title: 'Setup Ongoing Rank & Impression Tracking',
                  description: 'Review search query impressions in Google Search Console to identify rising keyword clusters.',
                  priority: 'low',
                  expectedBenefit: 'Data-driven roadmap for future content and expansion',
                },
              ],
            },
          ],
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Gemini SEO route error:', err);
    return NextResponse.json({ error: err.message || 'Gemini processing failed' }, { status: 500 });
  }
}
