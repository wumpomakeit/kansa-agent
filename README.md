<p align="center">
  <img src="https://img.shields.io/badge/ERC--8004-Agent%20Identity-blueviolet?style=for-the-badge" alt="ERC-8004" />
  <img src="https://img.shields.io/badge/Mantle-Network-00c4b4?style=for-the-badge" alt="Mantle" />
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

# 🔍 Kansa Agent

**"Is This Agent's Registration File Complete & Honest?"**

An ERC-8004 registration file auditor that checks whether an AI agent's metadata claims are consistent with its on-chain activity on Mantle Network.

> An AI research agent that audits ERC-8004 agent registrations on Mantle

---

## 🎯 What It Does

Every ERC-8004 agent has an `agentURI` pointing to a registration file (JSON) containing claims about its capabilities, skills, and endpoints. **Kansa Agent** examines whether those claims are truthful.

Paste any ERC-8004 registration JSON → get a scored audit across **4 categories**:

| Category | Weight | What It Checks |
|---|---|---|
| 📋 **Schema Completeness** | 30% | Required fields, format, capability declarations |
| 🌐 **Endpoint Health** | 20% | Are declared service endpoints actually reachable? |
| ⛓️ **Activity Honesty** | 25% | Do on-chain transactions match claimed capabilities? |
| 🛡️ **Mantle Risk Evaluation** | 25% | Cross-references addresses against Mantle Verified Contract Registry |

### Example

An agent claims to be a "swap router" but its wallet has never interacted with a DEX → **Activity Honesty** flags the inconsistency. Its registration references a contract address that isn't in the Mantle Verified Registry → **Mantle Risk Evaluation** issues a warning.

---

## 🏗️ How It's Built

```
Tech Stack
├── Next.js 14 (App Router)
├── TypeScript
├── Tailwind CSS
├── @mantleio/mantle-core (Mantle Agent Scaffold npm package)
└── viem (Mantle RPC interactions)
```

**Key design decisions:**
- **No LLM required** — all audit logic is pure deterministic code
- **Server-side checks** — API route runs all 4 audit categories in parallel
- **Real Mantle integration** — `validateAddress()`, `findRegistryByAddress()`, and `listRegistryEntries()` from `@mantleio/mantle-core` (not mocked)
- **3 built-in sample agents** for quick testing

---

## 🔌 Mantle Skills Integration

### What's real

| Component | Source | How It's Used |
|---|---|---|
| `validateAddress()` | `@mantleio/mantle-core` npm package | Validates address format + checks against Mantle Verified Registry |
| `findRegistryByAddress()` | `@mantleio/mantle-core` npm package | Looks up specific addresses in the registry |
| `listRegistryEntries()` | `@mantleio/mantle-core` npm package | Retrieves all 17 verified Mantle mainnet contracts |
| Pass/Warn/Block verdicts | Inspired by `mantle-risk-evaluator` Skill | Verdict pattern adapted for registration auditing |
| Registry data | From `mantle-address-registry-navigator` Skill | Same verified contract list used in `@mantleio/mantle-core` |

### What's honestly stated

- The **address validation and registry cross-referencing** are real API calls to `@mantleio/mantle-core`
- The **scoring thresholds** (point splits, coverage ratios) were designed for this use case — the risk-evaluator Skill's original thresholds are for DeFi transaction parameters (slippage, gas), not registration auditing
- The **verdict pattern** (pass/warn/block) is inspired by the Skill's methodology

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run Locally

```bash
git clone https://github.com/wumpomakeit/kansa-agent.git
cd kansa-agent
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 📁 Project Structure

```
kansa-agent/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page + audit form
│   │   └── api/audit/route.ts    # POST endpoint — runs all checks
│   ├── lib/
│   │   ├── auditor.ts            # Orchestrator — runs 4 categories, calculates score
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── samples.ts            # 3 demo registration files
│   │   └── checks/
│   │       ├── schema.ts         # Schema completeness checks
│   │       ├── endpoints.ts      # Endpoint reachability checks
│   │       ├── activity.ts       # On-chain activity vs claims
│   │       └── mantle-risk.ts    # Mantle registry cross-reference
│   └── components/
│       ├── ScoreGauge.tsx        # Circular score visualization
│       └── AuditReport.tsx       # Full audit report display
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## 🧪 API Usage

```bash
curl -X POST https://kansa-agent.vercel.app/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "registrationJson": "{\"name\":\"My Agent\",\"description\":\"A swap router\",\"version\":\"1.0.0\"}",
    "walletAddress": "0x..."
  }'
```

**Response:** Full audit result with overall score, grade (A+ to F), and detailed checks per category.

---

## 📜 ERC-8004 Context

[ERC-8004](https://8004.org/build) defines a standard for trustless AI agent identity and reputation on-chain. Each agent registers with:
- An `agentId` on a registry contract
- An `agentURI` pointing to a JSON metadata file
- Claims about capabilities, endpoints, and skills

Kansa Agent audits the **quality and honesty** of that metadata — not the quantity of feedback or reputation score.

---

## 📄 License

MIT

---

<p align="center">
  <sub>Built with ☕ for the Mantle Hackathon</sub>
</p>
