# B2B Plus AI Features - Frequently Asked Questions

## General Questions

### What AI technology does B2B Plus use?

B2B Plus uses Google Gemini 2.5, one of the most advanced AI models available. We use two variants:
- **Gemini 2.5 Flash**: For fast, simple tasks like chatbot responses
- **Gemini 2.5 Pro**: For complex analysis like opportunity detection and pricing optimization

### Is my data safe?

Yes. Your data is completely secure:
- All data is encrypted in transit and at rest
- Each organization's data is isolated using Row Level Security (RLS)
- AI never accesses data from other organizations
- Your data is never used to train AI models
- We comply with GDPR, CCPA, and other data protection regulations

### How accurate is the AI?

Accuracy varies by feature:
- **Chatbot responses**: 95%+ accuracy
- **Opportunity detection**: 85%+ accuracy
- **Pricing optimization**: 80%+ win rate improvement
- **Invoice extraction**: 90%+ accuracy

We continuously monitor and improve accuracy based on real-world usage.

### Can I customize the AI behavior?

Currently, AI behavior is optimized for B2B sales and cannot be customized. We're working on custom configurations for enterprise customers. Contact sales for more information.

### What languages does the AI support?

Currently, the AI primarily supports English. We're planning to add support for:
- Spanish
- French
- German
- Portuguese
- Mandarin Chinese

Check our roadmap for updates.

## Chatbot Questions

### How does the chatbot know about my orders?

The chatbot has secure access to your organization's data, including:
- Your order history
- Product catalog
- Cart contents
- Shipment tracking
- Account information

It uses this data to provide personalized, accurate responses.

### Can the chatbot place orders for me?

Not yet. Currently, the chatbot can:
- Check order status
- Search products
- View cart
- Track shipments
- Answer questions

Order placement is planned for a future release.

### Why doesn't the chatbot understand my question?

Try these tips:
- Be more specific
- Use simpler language
- Rephrase your question
- Break complex questions into smaller parts

Example:
- ❌ "stuff"
- ✅ "Show me my recent orders"

### Can I delete my chat history?

Yes. Chat conversations are stored for 90 days and then automatically deleted. You can also:
- Clear individual conversations
- Start a new conversation anytime
- Request manual deletion by contacting support

### Is the chatbot available 24/7?

Yes! The AI chatbot is available 24/7 with no wait times. For complex issues that require human assistance, our support team is available during business hours.

## Opportunity Detection Questions

### How often does the AI detect opportunities?

The AI automatically scans for opportunities:
- **Daily**: Automatic detection runs every night
- **Manual**: Admins can trigger detection anytime
- **Real-time**: Some opportunities are detected as events occur

### Why am I not seeing any opportunities?

Possible reasons:
- Insufficient customer data (need 3+ months of history)
- No recent customer activity
- All opportunities already pursued
- Filters hiding results

Try:
- Adjusting date range
- Clearing filters
- Running manual detection
- Checking data completeness

### Can I create custom opportunity types?

Not currently. We support three types:
1. Stopped Buying
2. Cross-Sell
3. Upsell

Custom opportunity types are planned for enterprise customers.

### How is the opportunity score calculated?

The score (0-100) considers:
- Customer purchase history
- Product affinity
- Timing and frequency
- Revenue potential
- Historical success rates
- Customer engagement level

Higher scores indicate higher likelihood of success.

### What should I do with low-scoring opportunities?

Options:
- **Dismiss**: If clearly not relevant
- **Monitor**: Keep for future reference
- **Batch Process**: Group similar low-score opportunities
- **Automate**: Set up automated follow-up emails

Focus your time on high-scoring opportunities (>70) for best ROI.

## Pricing Optimization Questions

### How does pricing optimization work?

The AI analyzes:
- Customer purchase history (12+ months)
- Historical win/loss rates at different price points
- Price sensitivity patterns
- Competitor pricing (if available)
- Seasonal trends
- Order volume correlations

It then recommends optimal prices to maximize both win rate and revenue.

### Will approving a price change affect existing orders?

No. Price changes only affect:
- New orders placed after approval
- Future quotes
- Product catalog display

Existing orders, quotes, and contracts are not affected.

### Can I set pricing rules or constraints?

Yes. Contact support to configure:
- Minimum/maximum price limits
- Margin requirements
- Customer-specific pricing rules
- Product category constraints
- Approval workflows

### What if I disagree with a pricing recommendation?

You can:
- **Reject**: Dismiss the recommendation
- **Provide Feedback**: Help the AI learn
- **Modify**: Manually adjust the price
- **Defer**: Save for later review

The AI learns from your decisions to improve future recommendations.

### How quickly do price changes take effect?

Immediately. Once approved:
- Product catalog updates instantly
- Customers see new price on next visit
- Quotes use new price
- No delay or batch processing

## Invoice Processing Questions

### What file formats are supported?

Currently, only PDF files are supported. We're planning to add:
- Images (JPG, PNG)
- Microsoft Word documents
- Excel spreadsheets
- Scanned documents

### Why is my invoice extraction inaccurate?

Common causes:
- Poor scan quality (use 300+ DPI)
- Skewed or rotated images
- Handwritten invoices
- Non-standard formats
- Damaged or faded documents

Tips for better accuracy:
- Use digital PDFs when possible
- Ensure good lighting for scans
- Keep documents flat and straight
- Use standard invoice templates

### Can I edit extracted data?

Yes! Always review and edit:
1. AI extracts data automatically
2. You review the extraction
3. Make any necessary corrections
4. Save to your system

This ensures 100% accuracy even if AI makes mistakes.

### Is there a file size limit?

Yes:
- **Maximum file size**: 10MB
- **Maximum pages**: 20 pages
- **Recommended**: < 5MB for best performance

For larger files, split into smaller documents.

### How long does extraction take?

Typically:
- **Simple invoices**: 2-5 seconds
- **Complex invoices**: 5-10 seconds
- **Multi-page invoices**: 10-30 seconds

Processing happens in real-time with progress indicators.

## Performance and Limits

### What are the rate limits?

Current limits per user:
- **Chatbot**: 10 requests/minute
- **Opportunity Detection**: 5 requests/minute
- **Pricing Optimization**: 5 requests/minute
- **Invoice Processing**: 3 requests/minute

Limits reset every minute. Enterprise plans can request higher limits.

### Why am I seeing "Rate Limit Exceeded"?

You've made too many requests in a short time. Solutions:
- Wait 60 seconds for limit to reset
- Spread out your requests
- Use batch operations when available
- Contact sales for higher limits

### How can I improve response times?

Tips:
- Use caching (repeated queries are faster)
- Simplify questions
- Avoid peak usage times
- Clear browser cache
- Check internet connection

Target response time: < 2 seconds

### What happens if the AI is down?

We have 99.9% uptime SLA. If AI services are unavailable:
- You'll see an error message
- Core features still work (orders, products, etc.)
- We're automatically notified
- Status updates posted to status.b2bplus.com

## Billing and Costs

### How is AI usage billed?

AI features are included in your subscription:
- **Starter**: Limited AI features
- **Professional**: Full AI features with usage limits
- **Enterprise**: Unlimited AI usage

No per-request charges or hidden fees.

### Can I see my AI usage?

Yes! Admins can view:
- Total requests by type
- Token usage
- Cost estimates
- Usage trends
- Department/user breakdown

Navigate to Admin → Monitoring

### What happens if I exceed my plan limits?

Depends on your plan:
- **Soft Limit**: Warning notification, continued access
- **Hard Limit**: Temporary restriction until next billing cycle
- **Enterprise**: No limits

We'll notify you before any restrictions.

## Privacy and Compliance

### Is my data used to train AI models?

No. Your data is only used to:
- Generate responses for your organization
- Improve your experience
- Provide analytics

It's never used to train AI models or shared with other customers.

### Can I export my AI data?

Yes. You can export:
- Chat conversations
- Opportunity data
- Pricing recommendations
- Usage metrics
- Business analytics

Formats: CSV, Excel, JSON

### How long is data retained?

Retention periods:
- **Chat conversations**: 90 days
- **AI metrics**: 1 year
- **Business metrics**: Indefinitely
- **Audit logs**: 2 years

You can request early deletion or extended retention.

### Is B2B Plus GDPR compliant?

Yes. We comply with:
- GDPR (EU)
- CCPA (California)
- PIPEDA (Canada)
- Other regional data protection laws

See our Privacy Policy for details.

## Troubleshooting

### The chatbot isn't responding. What should I do?

1. Check internet connection
2. Refresh the page
3. Clear browser cache
4. Try a different browser
5. Check status.b2bplus.com
6. Contact support if issue persists

### I'm getting errors. How do I report them?

Include this information:
- What you were trying to do
- Exact error message
- Time of error
- Screenshots (if applicable)
- Your user ID

Email: support@b2bplus.com

### How do I get help?

Multiple support channels:
- **In-App Help**: Click ? icon
- **Email**: support@b2bplus.com
- **Documentation**: docs.b2bplus.com
- **Training Videos**: training.b2bplus.com
- **Community Forum**: community.b2bplus.com

## Future Features

### What's coming next?

Planned features:
- Multi-language support
- Voice interface
- Mobile app AI features
- Custom AI workflows
- Advanced analytics
- Predictive forecasting

Check our roadmap: roadmap.b2bplus.com

### Can I request features?

Yes! We love feedback. Submit requests:
- In-app feedback form
- Email: product@b2bplus.com
- Community forum
- Quarterly user surveys

Popular requests are prioritized.

### When will [feature] be available?

Check our public roadmap for:
- Planned features
- Development status
- Expected release dates
- Beta testing opportunities

---

**Still have questions?**

Contact us:
- Email: support@b2bplus.com
- Phone: 1-800-B2B-PLUS
- Live Chat: Available in-app

*Last Updated: January 2025*
*Version: 1.0*

