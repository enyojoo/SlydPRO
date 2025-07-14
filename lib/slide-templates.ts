export interface SlideTemplate {
  id: string
  name: string
  description: string
  category: "business" | "startup" | "corporate" | "creative" | "minimal"
  thumbnail: string
  slides: Array<{
    id: string
    title: string
    content: string
    background: string
    textColor: string
    layout: "title" | "content" | "two-column" | "image" | "chart"
    gradient?: string
    pattern?: string
  }>
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
  }
  createdAt: Date
  updatedAt: Date
  isStarred?: boolean
  views?: number
}

export const slideTemplates: SlideTemplate[] = [
  {
    id: "food-delivery-pitch",
    name: "FoodFast Delivery Pitch",
    description: "AI-powered food delivery startup presentation",
    category: "startup",
    thumbnail: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    colors: {
      primary: "#667eea",
      secondary: "#764ba2",
      accent: "#f093fb",
      text: "#ffffff",
    },
    createdAt: new Date(Date.now() - 2 * 86400000), // 2 days ago
    updatedAt: new Date(Date.now() - 3600000), // 1 hour ago
    isStarred: true,
    views: 47,
    slides: [
      {
        id: "slide-1",
        title: "FoodFast: Revolutionary Food Delivery",
        content: "Connecting hungry customers with local restaurants through AI-powered logistics",
        background: "#667eea",
        textColor: "#ffffff",
        layout: "title",
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
      {
        id: "slide-2",
        title: "The Problem",
        content:
          "• 73% of customers wait over 45 minutes for delivery\n• Restaurants lose 30% revenue to high commission fees\n• Delivery drivers struggle with inefficient routing\n• Food quality deteriorates during long transit times",
        background: "#764ba2",
        textColor: "#ffffff",
        layout: "content",
      },
      {
        id: "slide-3",
        title: "Our Solution",
        content:
          "AI-powered routing reduces delivery time by 40%\n\nDirect restaurant partnerships with 15% lower fees\n\nReal-time quality monitoring ensures fresh food",
        background: "#667eea",
        textColor: "#ffffff",
        layout: "two-column",
      },
      {
        id: "slide-4",
        title: "Market Opportunity",
        content:
          "$150B global food delivery market growing at 12% annually\n\n45M potential customers in our target cities\n\n$2.3B addressable market in Year 3",
        background: "#764ba2",
        textColor: "#ffffff",
        layout: "chart",
      },
      {
        id: "slide-5",
        title: "Business Model",
        content:
          "• 8% commission from restaurants (vs 30% competitors)\n• $2.99 delivery fee per order\n• Premium subscription: $9.99/month\n• Corporate catering partnerships",
        background: "#667eea",
        textColor: "#ffffff",
        layout: "content",
      },
      {
        id: "slide-6",
        title: "Traction",
        content:
          "🚀 10,000+ active users in 3 months\n📈 $50K monthly recurring revenue\n🤝 150+ restaurant partners\n⭐ 4.8/5 customer satisfaction",
        background: "#764ba2",
        textColor: "#ffffff",
        layout: "content",
      },
      {
        id: "slide-7",
        title: "The Ask",
        content: "Seeking $2M Series A to expand to 5 new cities and scale our AI technology",
        background: "#667eea",
        textColor: "#ffffff",
        layout: "title",
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
    ],
  },
  {
    id: "q4-business-review",
    name: "Q4 Business Review 2024",
    description: "Quarterly performance and strategic insights presentation",
    category: "corporate",
    thumbnail: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    colors: {
      primary: "#1e3a8a",
      secondary: "#3b82f6",
      accent: "#60a5fa",
      text: "#ffffff",
    },
    createdAt: new Date(Date.now() - 5 * 86400000), // 5 days ago
    updatedAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
    isStarred: true,
    views: 32,
    slides: [
      {
        id: "slide-1",
        title: "Q4 Business Review 2024",
        content: "Strategic insights and performance metrics for the fourth quarter",
        background: "#1e3a8a",
        textColor: "#ffffff",
        layout: "title",
        gradient: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
      },
      {
        id: "slide-2",
        title: "Executive Summary",
        content:
          "• Revenue increased 23% YoY to $4.2M\n• Customer acquisition up 45%\n• Market expansion into 3 new regions\n• Team growth from 25 to 40 employees",
        background: "#3b82f6",
        textColor: "#ffffff",
        layout: "content",
      },
      {
        id: "slide-3",
        title: "Financial Performance",
        content: "Revenue: $4.2M (+23%)\nProfit Margin: 18.5%\nCustomer LTV: $2,400\nCAC: $180",
        background: "#1e3a8a",
        textColor: "#ffffff",
        layout: "chart",
      },
      {
        id: "slide-4",
        title: "Market Analysis",
        content: "Total Addressable Market: $50B\n\nOur Market Share: 2.3%\n\nGrowth Opportunity: 300% in next 2 years",
        background: "#3b82f6",
        textColor: "#ffffff",
        layout: "two-column",
      },
      {
        id: "slide-5",
        title: "2025 Strategy",
        content:
          "• Expand into European markets\n• Launch mobile application\n• Increase R&D investment by 40%\n• Strategic partnerships with industry leaders",
        background: "#1e3a8a",
        textColor: "#ffffff",
        layout: "content",
      },
    ],
  },
  {
    id: "creative-agency-portfolio",
    name: "Creative Studio Portfolio",
    description: "Brand design and digital solutions showcase",
    category: "creative",
    thumbnail: "linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)",
    colors: {
      primary: "#ff6b6b",
      secondary: "#feca57",
      accent: "#48dbfb",
      text: "#ffffff",
    },
    createdAt: new Date(Date.now() - 7 * 86400000), // 1 week ago
    updatedAt: new Date(Date.now() - 4 * 3600000), // 4 hours ago
    views: 28,
    slides: [
      {
        id: "slide-1",
        title: "Creative Design Studio",
        content: "Bringing brands to life through innovative design solutions",
        background: "#ff6b6b",
        textColor: "#ffffff",
        layout: "title",
        gradient: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)",
      },
      {
        id: "slide-2",
        title: "Our Services",
        content:
          "🎨 Brand Identity Design\n📱 Digital Product Design\n🌐 Web Development\n📊 Marketing Materials\n🎥 Motion Graphics",
        background: "#feca57",
        textColor: "#ffffff",
        layout: "content",
      },
      {
        id: "slide-3",
        title: "Portfolio Highlights",
        content: "50+ successful projects\n\n25+ happy clients\n\n3 design awards won",
        background: "#48dbfb",
        textColor: "#ffffff",
        layout: "image",
      },
      {
        id: "slide-4",
        title: "Our Process",
        content: "Discovery → Strategy → Design → Development → Launch",
        background: "#ff6b6b",
        textColor: "#ffffff",
        layout: "content",
        gradient: "linear-gradient(135deg, #ff6b6b 0%, #48dbfb 100%)",
      },
    ],
  },
  {
    id: "product-launch-2024",
    name: "Product Launch 2024",
    description: "Next-generation flagship product introduction",
    category: "minimal",
    thumbnail: "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)",
    colors: {
      primary: "#2d3748",
      secondary: "#4a5568",
      accent: "#63b3ed",
      text: "#ffffff",
    },
    createdAt: new Date(Date.now() - 10 * 86400000), // 10 days ago
    updatedAt: new Date(Date.now() - 6 * 3600000), // 6 hours ago
    views: 19,
    slides: [
      {
        id: "slide-1",
        title: "Product Launch 2024",
        content: "Introducing the next generation of our flagship product",
        background: "#2d3748",
        textColor: "#ffffff",
        layout: "title",
        gradient: "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)",
      },
      {
        id: "slide-2",
        title: "Key Features",
        content:
          "• 50% faster performance\n• Enhanced security protocols\n• Intuitive user interface\n• Cross-platform compatibility\n• 24/7 customer support",
        background: "#4a5568",
        textColor: "#ffffff",
        layout: "content",
      },
      {
        id: "slide-3",
        title: "Market Impact",
        content: "Expected to capture 15% market share within first year\n\nProjected revenue: $10M in Year 1",
        background: "#2d3748",
        textColor: "#ffffff",
        layout: "two-column",
      },
    ],
  },
  {
    id: "sustainability-initiative",
    name: "Green Future Initiative",
    description: "Sustainable energy transition and environmental impact",
    category: "business",
    thumbnail: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    colors: {
      primary: "#059669",
      secondary: "#10b981",
      accent: "#34d399",
      text: "#ffffff",
    },
    createdAt: new Date(Date.now() - 14 * 86400000), // 2 weeks ago
    updatedAt: new Date(Date.now() - 8 * 3600000), // 8 hours ago
    views: 15,
    slides: [
      {
        id: "slide-1",
        title: "Green Future Initiative",
        content: "Leading the transition to renewable energy solutions",
        background: "#059669",
        textColor: "#ffffff",
        layout: "title",
        gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
      },
      {
        id: "slide-2",
        title: "Environmental Impact",
        content:
          "🌱 50% reduction in carbon footprint\n♻️ 100% recyclable materials\n🌍 Zero waste manufacturing\n💚 Sustainable supply chain",
        background: "#10b981",
        textColor: "#ffffff",
        layout: "content",
      },
      {
        id: "slide-3",
        title: "Green Technology",
        content: "Solar-powered facilities\n\nWind energy integration\n\nSmart grid optimization",
        background: "#059669",
        textColor: "#ffffff",
        layout: "two-column",
      },
    ],
  },
]

export function getTemplateById(id: string): SlideTemplate | undefined {
  return slideTemplates.find((template) => template.id === id)
}

export function getTemplatesByCategory(category: string): SlideTemplate[] {
  return slideTemplates.filter((template) => template.category === category)
}
