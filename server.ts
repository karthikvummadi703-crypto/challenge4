import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { Match, Volunteer, Task, FoodOrder, MedicalEmergency, IssueReport } from "./src/types";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 5000;

app.use(express.json());

// In-memory Database
let matches: Match[] = [
  {
    id: "match-2026-1",
    stadiumName: "Mercedes-Benz Stadium",
    matchName: "Portugal vs Argentina",
    matchDate: "18/07/2026",
    matchTime: "07:30 PM",
    ticketPrice: 120,
    published: true,
  }
];

let volunteers: Volunteer[] = [
  { id: "1", name: "Karthik", volunteerId: "VOL-4821", status: "active" },
  { id: "2", name: "Rahul", volunteerId: "VOL-5934", status: "active" },
  { id: "3", name: "Priya", volunteerId: "VOL-8102", status: "active" },
  { id: "4", name: "John", volunteerId: "VOL-2647", status: "active" },
  { id: "5", name: "Ananya", volunteerId: "VOL-9913", status: "active" }
];

let tasks: Task[] = [
  { id: "task-1", type: "Deliver Food", details: "Deliver Veg Burger and 1 Coke", seatNumber: "A12-24", priority: "High", status: "pending", timestamp: new Date().toISOString() },
  { id: "task-2", type: "Medical Emergency", details: "Medical Emergency assistance - severe chest pain", seatNumber: "C18-10", priority: "High", status: "pending", timestamp: new Date().toISOString() },
  { id: "task-3", type: "Complaint Resolution", details: "Seat Occupancy Report - double booking", seatNumber: "C07-18", priority: "Medium", status: "pending", timestamp: new Date().toISOString() }
];

let foodOrders: FoodOrder[] = [
  { id: "order-1", items: [{ name: "Veg Burger", quantity: 1, price: 6.99 }, { name: "Coke", quantity: 1, price: 2.49 }], seatNumber: "A12-24", totalPrice: 9.48, status: "pending", timestamp: new Date().toISOString() },
  { id: "order-2", items: [{ name: "French Fries", quantity: 2, price: 3.49 }], seatNumber: "B15-10", totalPrice: 6.98, status: "delivered", timestamp: new Date().toISOString() }
];

let emergencies: MedicalEmergency[] = [
  { id: "em-1", seatNumber: "C18-10", status: "active", timestamp: new Date().toISOString() },
  { id: "em-2", seatNumber: "B15-15", status: "resolved", timestamp: new Date().toISOString() }
];

let issues: IssueReport[] = [
  { id: "iss-1", category: "Seat Occupancy", seatNumber: "C07-18", description: "Unoccupied ticket holder has occupied seat C07-18.", status: "open", timestamp: new Date().toISOString() },
  { id: "iss-2", category: "Dirty Washroom", seatNumber: "Section A", description: "Washroom in Sector A has a leakage", status: "open", timestamp: new Date().toISOString() },
  { id: "iss-3", category: "Harassment", seatNumber: "Section D", description: "Aggressive behavior reported in Row 4", status: "open", timestamp: new Date().toISOString() }
];

// Configuration
let config = {
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || "",
  n8nAiAssistantUrl: process.env.N8N_AI_ASSISTANT_URL || "",
  useMockAI: true,
};

// --- API ENDPOINTS ---

// Webhook / config endpoints
app.get("/api/config", (req, res) => {
  res.json(config);
});

app.post("/api/config", (req, res) => {
  const { n8nWebhookUrl, n8nAiAssistantUrl, useMockAI } = req.body;
  if (n8nWebhookUrl !== undefined) config.n8nWebhookUrl = n8nWebhookUrl;
  if (n8nAiAssistantUrl !== undefined) config.n8nAiAssistantUrl = n8nAiAssistantUrl;
  if (useMockAI !== undefined) config.useMockAI = useMockAI;
  res.json({ message: "Configuration updated successfully", config });
});

// Matches endpoints
app.get("/api/matches", (req, res) => {
  res.json(matches);
});

app.post("/api/matches", (req, res) => {
  const { stadiumName, matchName, matchDate, matchTime, ticketPrice } = req.body;
  
  if (!stadiumName || !matchName || !matchDate || !matchTime || !ticketPrice) {
    res.status(400).json({ error: "Missing required fields for match creation" });
    return;
  }

  const newMatch: Match = {
    id: `match-${Date.now()}`,
    stadiumName,
    matchName,
    matchDate,
    matchTime,
    ticketPrice: Number(ticketPrice),
    published: false // unpublished by default
  };

  matches.push(newMatch);
  res.status(201).json(newMatch);
});

// Volunteers endpoints
app.get("/api/volunteers", (req, res) => {
  res.json(volunteers);
});

app.post("/api/volunteers", (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "Volunteer name is required" });
    return;
  }

  // Generate unique ID VOL-xxxx
  let uniqueId = "";
  let isUnique = false;
  while (!isUnique) {
    const num = Math.floor(1000 + Math.random() * 9000);
    uniqueId = `VOL-${num}`;
    isUnique = !volunteers.some(v => v.volunteerId === uniqueId);
  }

  const newVolunteer: Volunteer = {
    id: `vol-${Date.now()}`,
    name,
    volunteerId: uniqueId,
    status: "inactive" // inactive until published
  };

  volunteers.push(newVolunteer);
  res.status(201).json(newVolunteer);
});

app.delete("/api/volunteers/:id", (req, res) => {
  const { id } = req.params;
  volunteers = volunteers.filter(v => v.id !== id);
  res.json({ message: "Volunteer removed successfully" });
});

// Publish endpoint
app.post("/api/publish", (req, res) => {
  // Publish all matches and activate all volunteers
  matches = matches.map(m => ({ ...m, published: true }));
  volunteers = volunteers.map(v => ({ ...v, status: "active" }));
  res.json({ message: "Event published successfully! Matches are live and volunteers active.", matches, volunteers });
});

// Volunteer Login
app.post("/api/volunteer/login", (req, res) => {
  const { name, volunteerId } = req.body;
  if (!name || !volunteerId) {
    res.status(400).json({ error: "Name and Volunteer ID are required" });
    return;
  }

  const volunteer = volunteers.find(
    v => v.name.toLowerCase() === name.toLowerCase() && v.volunteerId === volunteerId
  );

  if (!volunteer) {
    res.status(401).json({ error: "Invalid volunteer credentials" });
    return;
  }

  res.json({ success: true, volunteer });
});

// Live Task Stack endpoints
app.get("/api/tasks", (req, res) => {
  res.json(tasks);
});

app.post("/api/tasks/:id/accept", (req, res) => {
  const { id } = req.params;
  const { volunteerId } = req.body;

  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  tasks[taskIndex].status = "accepted";
  tasks[taskIndex].assignedTo = volunteerId;

  res.json(tasks[taskIndex]);
});

app.post("/api/tasks/:id/complete", (req, res) => {
  const { id } = req.params;

  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  tasks[taskIndex].status = "completed";

  // If this task was linked to a food order or emergency or issue, resolve it
  const seatNum = tasks[taskIndex].seatNumber;
  if (tasks[taskIndex].type === "Deliver Food") {
    const order = foodOrders.find(o => o.seatNumber === seatNum && o.status !== "delivered");
    if (order) order.status = "delivered";
  } else if (tasks[taskIndex].type === "Medical Emergency") {
    const em = emergencies.find(e => e.seatNumber === seatNum && e.status !== "resolved");
    if (em) em.status = "resolved";
  } else if (tasks[taskIndex].type === "Complaint Resolution" || tasks[taskIndex].type === "Seat Issue") {
    const issue = issues.find(i => i.seatNumber === seatNum && i.status !== "resolved");
    if (issue) issue.status = "resolved";
  }

  res.json(tasks[taskIndex]);
});

// Fan registering / Login (demo only)
let fans: any[] = [];
app.post("/api/fan/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const newFan = { id: `fan-${Date.now()}`, name, email };
  fans.push(newFan);
  res.status(201).json({ success: true, user: newFan });
});

// Fan Services: Food Ordering
app.post("/api/fan/order-food", (req, res) => {
  const { items, seatNumber, totalPrice } = req.body;
  if (!items || !seatNumber) {
    res.status(400).json({ error: "Missing items or seat location" });
    return;
  }

  const newOrder: FoodOrder = {
    id: `order-${Date.now()}`,
    items,
    seatNumber,
    totalPrice: Number(totalPrice),
    status: "pending",
    timestamp: new Date().toISOString()
  };

  foodOrders.push(newOrder);

  // Add a task to the volunteer task stack!
  const taskDetails = `Deliver ${items.map((i: any) => `${i.name} (x${i.quantity})`).join(", ")}`;
  tasks.push({
    id: `task-${Date.now()}`,
    type: "Deliver Food",
    details: taskDetails,
    seatNumber,
    priority: "Medium",
    status: "pending",
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newOrder);
});

// Fan Services: Medical Emergency
app.post("/api/fan/medical-emergency", (req, res) => {
  const { seatNumber } = req.body;
  if (!seatNumber) {
    res.status(400).json({ error: "Seat number is required" });
    return;
  }

  const newEmergency: MedicalEmergency = {
    id: `em-${Date.now()}`,
    seatNumber,
    status: "active",
    timestamp: new Date().toISOString()
  };

  emergencies.push(newEmergency);

  // High priority task to the volunteers
  tasks.push({
    id: `task-${Date.now()}`,
    type: "Medical Emergency",
    details: "CRITICAL: First Responder assistance requested at Seat.",
    seatNumber,
    priority: "High",
    status: "pending",
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newEmergency);
});

// Fan Services: Report Issue
app.post("/api/fan/report-issue", (req, res) => {
  const { category, seatNumber, description } = req.body;
  if (!category || !seatNumber) {
    res.status(400).json({ error: "Category and seat number are required" });
    return;
  }

  const newReport: IssueReport = {
    id: `iss-${Date.now()}`,
    category,
    seatNumber,
    description: description || "No detailed description",
    status: "open",
    timestamp: new Date().toISOString()
  };

  issues.push(newReport);

  // Task on the stack
  tasks.push({
    id: `task-${Date.now()}`,
    type: "Complaint Resolution",
    details: `${category} Issue - ${description || "No detail"}`,
    seatNumber,
    priority: category === "Harassment" ? "High" : "Medium",
    status: "pending",
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newReport);
});

// Organizer Overview Stats
app.get("/api/organizer/stats", (req, res) => {
  // Counts
  const totalVolunteers = volunteers.length;
  const activeVolunteers = volunteers.filter(v => v.status === "active").length;
  const totalFoodOrders = foodOrders.length;
  const openIssues = issues.filter(i => i.status === "open").length;
  const activeEmergencies = emergencies.filter(e => e.status === "active").length;
  
  // Recent alerts generated dynamically based on active problems
  const recentAlerts = [
    ...emergencies.filter(e => e.status === "active").map(e => ({
      id: e.id,
      type: "medical",
      text: `Medical Assistance at Seat ${e.seatNumber}`,
      time: "Just now",
      priority: "critical"
    })),
    ...issues.filter(i => i.status === "open").map(i => ({
      id: i.id,
      type: "issue",
      text: `${i.category} Report at ${i.seatNumber}`,
      time: "2 mins ago",
      priority: i.category === "Harassment" ? "critical" : "warning"
    })),
    ...foodOrders.filter(o => o.status === "pending").map(o => ({
      id: o.id,
      type: "food",
      text: `Pending Food Delivery for Seat ${o.seatNumber}`,
      time: "5 mins ago",
      priority: "normal"
    }))
  ];

  res.json({
    volunteers: {
      total: totalVolunteers,
      active: activeVolunteers
    },
    foodOrders: {
      total: totalFoodOrders,
      pending: foodOrders.filter(o => o.status === "pending").length,
      delivered: foodOrders.filter(o => o.status === "delivered").length
    },
    issues: {
      total: issues.length,
      open: openIssues
    },
    emergencies: {
      active: activeEmergencies,
      total: emergencies.length
    },
    attendance: 48567, // matches the design asset
    recentAlerts: recentAlerts.slice(0, 6)
  });
});

// Nexus AI Command Center (for bot interaction & optional n8n forwarding)
app.post("/api/ai/command", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: "Command string is required" });
    return;
  }

  // If user configured n8n AI Assistant URL, we try to call it!
  if (config.n8nAiAssistantUrl && config.n8nAiAssistantUrl.trim() !== "") {
    try {
      const response = await fetch(config.n8nAiAssistantUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          context: {
            volunteersCount: volunteers.length,
            foodOrdersCount: foodOrders.length,
            pendingOrdersCount: foodOrders.filter(o => o.status === "pending").length,
            issuesCount: issues.length,
            openIssuesCount: issues.filter(i => i.status === "open").length,
            emergenciesCount: emergencies.filter(e => e.status === "active").length,
            attendance: 48567
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Assume response format { output: "..." } or { text: "..." }
        const aiResponse = data.output || data.text || JSON.stringify(data);
        res.json({ response: aiResponse, source: "n8n Webhook" });
        return;
      } else {
        console.warn("n8n AI Webhook returned non-ok status, falling back to local rule-based intelligence.");
      }
    } catch (e) {
      console.error("Failed to fetch from n8n AI Webhook:", e);
    }
  }

  // --- LOCAL HIGH-INTELLIGENCE RULE-BASED RESPONSES ---
  const query = text.toLowerCase().trim();
  let responseText = "";

  if (query.includes("summarize today's incidents") || query.includes("incident") || query.includes("issues")) {
    const openIss = issues.filter(i => i.status === "open");
    responseText = `**Stadium Incident Summary**: We have recorded **${issues.length} total issues** today, with **${openIss.length} currently open**.
- **Seat Occupancy**: ${openIss.filter(i => i.category === 'Seat Occupancy').length} unresolved complaints.
- **Dirty Washrooms**: ${openIss.filter(i => i.category === 'Dirty Washroom').length} reported cleaning tickets.
- **Harassment**: ${openIss.filter(i => i.category === 'Harassment').length} critical incidents.
*All unresolved issues have been dispatched to the Volunteer Live Task Stack for prompt resolution.*`;
  } 
  else if (query.includes("how many food orders") || query.includes("food") || query.includes("order")) {
    const pending = foodOrders.filter(o => o.status === "pending").length;
    const preparing = foodOrders.filter(o => o.status === "preparing").length;
    const delivered = foodOrders.filter(o => o.status === "delivered").length;
    responseText = `**Food Logistics Report**:
- **Total Orders**: ${foodOrders.length}
- **Pending Deliveries**: ${pending} (dispatched to volunteers)
- **Delivered**: ${delivered}
- **Popular Item**: *Veg Burger with French Fries* has been ordered the most today, comprising 64% of overall orders. Seat delivery times are averaging **8.4 minutes** across all sectors.`;
  } 
  else if (query.includes("gate") || query.includes("congested") || query.includes("crowd")) {
    responseText = `**Gate Ingress Analysis**:
- **Gate C (High Congestion)**: Estimated entry delay of **14 minutes** due to heavy flow towards Section C.
- **Gate A (Moderate)**: Estimated entry delay of **6 minutes**.
- **Gate B & D (Optimal)**: Entry delay is **<2 minutes**.
*Recommendation*: Reroute incoming fans from North transit lines to **Gate B** via digital signage and notify stewards in Section C to open overflow gates.`;
  } 
  else if (query.includes("volunteer") || query.includes("available")) {
    const active = volunteers.filter(v => v.status === "active").length;
    const busy = tasks.filter(t => t.status === "accepted").length;
    const free = active - busy;
    responseText = `**Volunteer Deployment Matrix**:
- **Active Logged-In**: ${volunteers.length} volunteers are fully synchronized.
- **Available / On Standby**: ${Math.max(0, free)} personnel.
- **Assigned / Active Tasks**: ${busy} volunteers currently handling incidents on-foot.
*Deployment Efficiency*: **91% SLA compliance** on high-priority medical and security alerts over the last hour.`;
  } 
  else if (query.includes("medical") || query.includes("emergencies")) {
    const activeEm = emergencies.filter(e => e.status === "active");
    if (activeEm.length === 0) {
      responseText = `**Medical Safety Dashboard**: Good news. There are currently **0 active medical emergencies** in the stadium. All historical cases have been resolved.`;
    } else {
      responseText = `**Medical Emergency Alert**: There are currently **${activeEm.length} active medical emergencies**:
${activeEm.map((e, index) => `${index + 1}. **Seat ${e.seatNumber}** - Dispatched to medical responders (Priority: HIGH)`).join("\n")}
*Steward units and stadium paramedics are currently en-route. Average response time is 2.4 minutes.*`;
    }
  } 
  else if (query.includes("hello") || query.includes("hi") || query.includes("who are you")) {
    responseText = `Hello! I am **Nexus AI**, the Stadium Intelligence Assistant for FIFA World Cup 2026. I can assist you with real-time operational query reports, incident coordination, heatmaps, and dispatcher automation. Try asking:
- *"Summarize today's incidents"*
- *"How many food orders are pending?"*
- *"Which gate is most congested?"*
- *"Show available volunteers"*`;
  }
  else {
    // Elegant context-sensitive default response
    responseText = `I've analyzed your query regarding stadium operations. 
Based on our real-time Nexus telemetry (current attendance: **48,567**):
- **Logistics**: Food order queues are currently stable with **${foodOrders.filter(o => o.status === 'pending').length} pending**.
- **Security**: There are **${issues.filter(i => i.status === 'open').length} open tickets**.
- **Safety**: **${emergencies.filter(e => e.status === 'active').length} active medical cases** are being handled.

Would you like me to dispatch extra volunteer units to Gate C or compile a comprehensive PDF debrief?`;
  }

  res.json({ response: responseText, source: "Nexus Local Engine" });
});


// --- VITE MIDDLEWARE AND STATIC SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite development middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nexus Server] running on http://localhost:${PORT}`);
  });
}

startServer();
