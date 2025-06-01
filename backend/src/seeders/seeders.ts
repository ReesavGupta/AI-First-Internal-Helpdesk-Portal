// src/seeders/documentSeeder.ts
import { prisma } from '../../prisma/client'

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

// Run if called directly
if (require.main === module) {
  seedDocuments()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
