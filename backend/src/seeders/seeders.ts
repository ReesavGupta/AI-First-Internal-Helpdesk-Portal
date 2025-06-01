// src/seeders/documentSeeder.ts
import { prisma } from '../../prisma/client'
import { FAQVisibility } from '../../prisma/generated/prisma'

const predefinedDocuments = [
  {
    title: 'Employee Leave Policy',
    category: 'HR',
    tags: ['leave', 'vacation', 'sick', 'policy', 'hr'],
    content: `
# Employee Leave Policy

## Annual Leave
- All full-time employees are entitled to 25 days of annual leave per year
- Leave must be requested at least 2 weeks in advance
- Maximum 10 consecutive days without manager approval

## Sick Leave
- Up to 10 days of sick leave per year
- Medical certificate required for absences longer than 3 days
- Sick leave cannot be carried forward to next year

## Maternity/Paternity Leave
- 6 months paid maternity leave
- 2 weeks paid paternity leave
- Must notify HR at least 3 months before expected due date

## Emergency Leave
- Up to 3 days for family emergencies
- Bereavement leave: 5 days for immediate family
- Manager approval required within 24 hours

## How to Apply
1. Fill out leave request form on HR portal
2. Get manager approval
3. Submit to HR department
4. Receive confirmation email
    `,
  },
  {
    title: 'IT Equipment Request Process',
    category: 'IT',
    tags: ['equipment', 'laptop', 'hardware', 'request', 'it'],
    content: `
# IT Equipment Request Process

## Requesting New Equipment
1. Log into IT Service Portal
2. Select "Equipment Request"
3. Choose equipment type:
   - Laptop/Desktop
   - Monitor
   - Phone
   - Software License
   - Accessories

## Approval Process
- Requests under $500: Manager approval only
- Requests over $500: Manager + IT Director approval
- Budget approval required for requests over $2000

## Delivery Timeline
- Standard equipment: 3-5 business days
- Special orders: 1-2 weeks
- Software licenses: Same day (if available)

## Equipment Return
- All equipment must be returned when leaving company
- Equipment older than 3 years eligible for replacement
- Report damaged equipment immediately to IT helpdesk

## Emergency Requests
- Contact IT helpdesk directly: ext. 2400
- For urgent business needs only
- Manager approval required within 24 hours
    `,
  },
  {
    title: 'Expense Reimbursement Guidelines',
    category: 'Finance',
    tags: ['expense', 'reimbursement', 'travel', 'finance', 'receipts'],
    content: `
# Expense Reimbursement Guidelines

## Eligible Expenses
- Business travel (flights, hotels, meals)
- Client entertainment (within limits)
- Office supplies for remote work
- Professional development courses
- Business phone/internet costs

## Submission Requirements
- Original receipts required
- Submit within 30 days of expense
- Include business justification
- Manager approval needed

## Expense Limits
- Meals: $50/day domestic, $75/day international
- Hotel: $200/night in major cities
- Entertainment: $100 per client per event
- Office supplies: $200/month for remote workers

## Reimbursement Process
1. Submit through expense portal
2. Attach all receipts
3. Manager approval
4. Finance review
5. Payment within 7-10 business days

## Non-Reimbursable Items
- Personal items
- Alcoholic beverages (except client entertainment)
- Traffic fines
- Personal phone calls
- Gym memberships
    `,
  },
  {
    title: 'Password and Security Policy',
    category: 'IT',
    tags: ['password', 'security', '2fa', 'login', 'cyber'],
    content: `
# Password and Security Policy

## Password Requirements
- Minimum 12 characters
- Must include: uppercase, lowercase, numbers, symbols
- Cannot reuse last 5 passwords
- Must change every 90 days
- No dictionary words or personal information

## Two-Factor Authentication (2FA)
- Required for all business applications
- Use company-approved authenticator app
- Backup codes stored securely
- Report lost devices immediately

## Account Security
- Never share passwords or accounts
- Lock workstation when away
- Report suspicious emails to security@company.com
- Don't use personal accounts for business

## Incident Reporting
- Report security incidents within 1 hour
- Include: what happened, when, what data affected
- Contact: security@company.com or ext. 2911
- Don't try to fix security issues yourself

## VPN Access
- Required for all remote connections
- Use only company-approved VPN
- Connect before accessing any business systems
- Disconnect when not in use

## Social Engineering Prevention
- Verify caller identity before sharing information
- Be suspicious of urgent requests for data
- Never provide passwords over phone/email
- When in doubt, ask IT security team
    `,
  },
  {
    title: 'Remote Work Guidelines',
    category: 'General',
    tags: ['remote', 'work', 'home', 'policy', 'wfh'],
    content: `
# Remote Work Guidelines

## Eligibility
- Employees with 6+ months tenure
- Good performance record
- Role suitable for remote work
- Manager approval required

## Work Schedule
- Core hours: 9 AM - 3 PM in company timezone
- Flexible start/end times within reason
- Must be available for meetings and calls
- Update calendar with working hours

## Home Office Setup
- Dedicated workspace required
- Ergonomic chair and desk recommended
- Good lighting and minimal distractions
- Reliable internet (minimum 25 Mbps)

## Equipment Provided
- Laptop and monitor
- Headset for calls
- Office supplies budget: $200/quarter
- Software licenses as needed

## Communication Requirements
- Daily check-in with team
- Join all scheduled meetings
- Respond to messages within 4 hours
- Use company communication tools only

## Performance Expectations
- Meet all deadlines and deliverables
- Maintain same productivity as office work
- Participate actively in team activities
- Complete monthly remote work assessment

## Security at Home
- Use VPN for all work connections
- Secure home WiFi network
- Lock screen when away
- Don't let family use work devices
    `,
  },
]

const predefinedFAQs = [
  {
    question: 'How do I reset my password?',
    answer:
      'To reset your password:\n1. Click on "Forgot Password" on the login page\n2. Enter your email address\n3. Check your email for reset instructions\n4. Follow the link and create a new password',
    tags: ['password', 'login', 'account'],
    visibility: FAQVisibility.PUBLIC,
  },
  {
    question: 'How do I submit a new IT support ticket?',
    answer:
      '1. Log into the helpdesk portal\n2. Click "New Ticket"\n3. Fill in the ticket details including title and description\n4. Add any relevant attachments\n5. Click Submit',
    tags: ['ticket', 'support', 'help'],
    visibility: FAQVisibility.PUBLIC,
  },
  {
    question: 'What are the working hours for IT support?',
    answer:
      'IT support is available:\n- Monday to Friday: 9:00 AM - 5:00 PM\n- Emergency support available 24/7 for critical issues\n- Weekend support by appointment only',
    tags: ['support', 'hours', 'schedule'],
    visibility: FAQVisibility.PUBLIC,
  },
  {
    question: 'How long does it typically take to resolve a ticket?',
    answer:
      'Resolution times vary by priority:\n- High: 4 hours\n- Medium: 24 hours\n- Low: 48-72 hours\nThese are target times and actual resolution may vary based on complexity.',
    tags: ['ticket', 'resolution', 'sla'],
    visibility: FAQVisibility.PUBLIC,
  },
  {
    question: 'What information should I include in a ticket?',
    answer:
      'For fastest resolution, include:\n1. Clear description of the issue\n2. Steps to reproduce the problem\n3. Error messages (if any)\n4. Screenshots (when applicable)\n5. When the issue started\n6. Impact on your work',
    tags: ['ticket', 'help', 'support'],
    visibility: FAQVisibility.PUBLIC,
  },
  {
    question: '[INTERNAL] Common Ticket Resolution Steps',
    answer:
      '1. Initial triage within 15 minutes\n2. Categorize and assign priority\n3. Basic troubleshooting steps\n4. Escalate if needed\n5. Document solution\n6. Follow up with user',
    tags: ['internal', 'process', 'support'],
    visibility: FAQVisibility.INTERNAL,
  },
]

export const seedDocuments = async () => {
  try {
    console.log('🌱 Seeding predefined documents...')

    // Clear existing documents (optional)
    await prisma.document.deleteMany({})

    // Insert predefined documents
    const createdDocs = await prisma.document.createMany({
      data: predefinedDocuments,
      skipDuplicates: true,
    })

    console.log(`✅ Successfully seeded ${createdDocs.count} documents`)

    // Verify the seeding
    const totalDocs = await prisma.document.count()
    console.log(`📚 Total documents in database: ${totalDocs}`)
  } catch (error) {
    console.error('❌ Error seeding documents:', error)
    throw error
  }
}

export const seedFAQs = async () => {
  try {
    console.log('🌱 Seeding predefined FAQs...')

    // Clear existing FAQs (optional)
    await prisma.fAQ.deleteMany({})

    // Insert predefined FAQs
    const createdFAQs = await prisma.fAQ.createMany({
      data: predefinedFAQs,
      skipDuplicates: true,
    })

    console.log(`✅ Successfully seeded ${createdFAQs.count} FAQs`)

    // Verify the seeding
    const totalFAQs = await prisma.fAQ.count()
    console.log(`❓ Total FAQs in database: ${totalFAQs}`)
  } catch (error) {
    console.error('❌ Error seeding FAQs:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  Promise.all([seedDocuments(), seedFAQs()])
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
