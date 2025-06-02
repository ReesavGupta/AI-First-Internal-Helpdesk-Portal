# Helpdesk Portal Demo Script (4:30 mins)

**Overall Goal:** Showcase the AI-First Internal Helpdesk Portal's core functionalities, emphasizing user roles, ticket lifecycle, and intelligent document retrieval for AI assistance.

**Preparation:**

- Ensure backend and frontend servers are running.
- Have sample documents ready for upload (e.g., a PDF or TXT policy document).
- Browser 1 (New Incognito/Private Window): For Employee signup and usage.
- Browser 2: Pre-logged in as an **ADMIN** user.
- Browser 3: Pre-logged in as an **AGENT** user.

---

## Segment 1: New Employee Signup & Initial View (0:00 - 0:45 | 45s)

**Persona:** New Employee
**Browser:** Browser 1 (New Incognito)

**Action:**

1.  Navigate to the frontend application URL.
2.  Click the "Sign Up" button/link.
3.  Fill out the registration form:
    - Name (e.g., "Eve Employee")
    - Email (e.g., "eve@example.com")
    - Password
    - Select **Role: EMPLOYEE**
4.  Submit the form.
5.  Briefly show the Employee dashboard:
    - Point out "My Tickets", "New Ticket", "FAQ", "AI Assistant".
    - Mention the sidebar reflecting Employee-specific navigation.

**Talking Points:**

- "Welcome! We're looking at our AI-First Internal Helpdesk Portal. Let's start by signing up a new employee."
- (While signing up) "The system supports different user roles. We're creating an 'Employee' account now. This role is for general staff who need to submit support requests."
- (After login) "This is the Employee dashboard. It's designed to be simple: Eve can create new tickets, view her existing ones, access FAQs, and use our AI Assistant for quick answers. The sidebar is tailored to her role."

---

## Segment 2: Admin - Viewing Departments (0:45 - 1:10 | 25s)

**Persona:** Administrator
**Browser:** Browser 2 (Admin)

**Action:**

1.  Switch to the Admin browser window.
2.  If not already there, navigate to the "Departments" page using the sidebar.
3.  Show the list of existing departments.
4.  (Optional, if quick) Briefly click into one department to show its details (e.g., agents associated, recent tickets – noting satisfaction was removed).

**Talking Points:**

- "Now, let's switch to our Admin user. Admins have full system oversight."
- "Here in the 'Departments' section, Admins can see and manage all the support departments within the organization, like IT, HR, or Facilities."
- "This helps in structuring support and routing tickets correctly. You can see key information for each department."

---

## Segment 3: Admin - RAG Document Management (1:10 - 2:00 | 50s)

**Persona:** Administrator
**Browser:** Browser 2 (Admin)

**Action:**

1.  From the Admin sidebar, navigate to "Document Management".
2.  Explain the purpose of this section (RAG).
3.  Use the file input to select a sample internal document (e.g., an HR policy PDF or a technical guide).
4.  Click "Upload Document".
5.  Mention that the document is now being processed in the background for AI use.

**Talking Points:**

- "A core feature for our AI is Retrieval Augmented Generation, or RAG. Admins can upload internal documents here."
- "I'm uploading a sample company policy document. Once uploaded, our backend processes it: extracting text, splitting it into manageable chunks, and generating vector embeddings."
- "These embeddings allow our AI to search and retrieve relevant information from our own knowledge base to answer user queries accurately and with context."

---

## Segment 4: Employee - Creating a Ticket & Using AI Assistant (RAG) (2:00 - 3:00 | 60s)

**Persona:** New Employee (Eve)
**Browser:** Browser 1 (Employee)

**Action:**

1.  Switch back to the Employee (Eve's) browser.
2.  Navigate to "New Ticket".
3.  Fill in ticket details:
    - Subject (e.g., "Vacation Policy Question")
    - Description (e.g., "How many vacation days are new employees entitled to?")
    - Select a relevant Department (if the field is present).
4.  Submit the ticket.
5.  After the ticket is created, navigate to the "AI Assistant" from the sidebar.
6.  Ask a question related to the document the Admin just uploaded (e.g., "What is the vacation policy for new hires?").
7.  Show the AI's response and highlight if it cites the source document.

**Talking Points:**

- "Back as Eve, our employee. She's just created a support ticket for her vacation query."
- "But perhaps she needs a faster answer. She can use the AI Assistant."
- (Asking the AI) "Let's ask the AI about the vacation policy, which is covered in the document our Admin uploaded moments ago."
- (Showing AI response) "And here's the answer! Notice how the AI can provide specific details. If we configured it, it could also cite the source document it used, thanks to our RAG system."

---

## Segment 5: Agent - Viewing Tickets & Notifications (3:00 - 3:45 | 45s)

**Persona:** Support Agent
**Browser:** Browser 3 (Agent)

**Action:**

1.  Switch to the Agent browser window.
2.  Show the Agent dashboard. Point out sections like "Assigned Tickets" or "All Tickets".
3.  Find and open the ticket Eve just created (it might be in "All Tickets" or an unassigned queue depending on your setup).
4.  Briefly show the ticket details from the Agent's perspective.
5.  Point to the notification bell icon in the sidebar and mention its purpose (e.g., for new assignments or updates).

**Talking Points:**

- "Now let's see the Agent's view. Agents are the ones who handle and resolve these support tickets."
- "The Agent dashboard shows new or assigned tickets. They have more tools to manage tickets compared to employees."
- (Opening Eve's ticket) "Here's the ticket Eve submitted. The agent can now investigate, update its status, add comments, and resolve it."
- "Agents also get notifications – see the bell icon? This keeps them updated on new tickets or important changes, helping them respond promptly."

---

## Segment 6: Admin - Quick Look at AI Insights (Optional if time tight) (3:45 - 4:00 | 15s)

**Persona:** Administrator
**Browser:** Browser 2 (Admin)

**Action:**

1.  Quickly switch back to the Admin browser.
2.  Navigate to "AI Insights" from the sidebar.
3.  Very briefly show the page (even if it's a placeholder or has basic stats).

**Talking Points:**

- "Finally, Admins have access to AI Insights. This area can provide analytics on AI usage, common questions, and the effectiveness of the RAG documents, helping to refine the knowledge base and AI performance over time."

---

## Segment 7: Conclusion & Key Takeaways (4:00 - 4:30 | 30s)

**Action:**

- Can switch to a general screen or the main dashboard.

**Talking Points:**

- "So, in just a few minutes, we've seen how our AI-First Internal Helpdesk streamlines the support process:"
- "1. Clear roles for Employees, Agents, and Admins."
- "2. Easy ticket submission for employees."
- "3. Powerful document management for Admins to feed the AI with internal knowledge."
- "4. An AI Assistant that uses this knowledge to provide instant, relevant answers."
- "5. Efficient ticket handling tools for Agents."
- "This system is designed to improve response times, empower users with self-service, and provide support staff with the information they need."
- "Thank you! Are there any questions?"

---

**Tips for Delivery:**

- Practice the flow to ensure smooth transitions between browsers/personas.
- Have your example data (like usernames, passwords, ticket content, document to upload) ready.
- Speak clearly and try to match your actions with your talking points.
- If a step takes longer than expected, be ready to summarize the next point quickly.
- The scrollable sidebar is a general UI improvement you can subtly point out when navigating as any user.
