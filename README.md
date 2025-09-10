# WarrantyExtendChain

## Overview

WarrantyExtendChain is a Web3 project built on the Stacks blockchain using Clarity smart contracts. It automates warranty extensions for consumer products based on resolved complaints, addressing real-world issues in warranty management. Traditional warranty systems are often opaque, manual, and prone to disputes between manufacturers, retailers, and customers. This leads to inefficiencies, fraud, and customer dissatisfaction—problems exacerbated in global supply chains where verification is challenging.

By leveraging blockchain, WarrantyExtendChain provides a transparent, trustless system where warranties are tokenized as NFTs, complaints are filed on-chain, and extensions are automatically triggered upon resolution of virtual complaints (e.g., via digital evidence) or in-person inspections (verified through oracles or multisig attestations). This solves:
- **Fraud Prevention**: Immutable records prevent tampering with warranty claims.
- **Efficiency**: Automation reduces administrative overhead for companies.
- **Customer Trust**: Decentralized verification ensures fair resolutions, potentially reducing litigation.
- **Global Accessibility**: Works for cross-border products, using crypto for stakes or rewards.
- **Sustainability**: Encourages quality improvements by tying extensions to verified fixes.

The project involves 6 core smart contracts written in Clarity, ensuring security and Bitcoin-anchored finality via Stacks.

## Architecture

The system flows as follows:
1. Manufacturers register product warranties as NFTs.
2. Customers file complaints with evidence.
3. Resolutions occur via virtual (on-chain voting/evidence) or in-person (oracle-fed) inspections.
4. Upon resolution, warranties auto-extend if criteria are met.
5. Governance allows community updates.

Smart contracts interact via traits and public functions for modularity.

## Smart Contracts

Here’s an overview of the 6 Clarity smart contracts:

1. **WarrantyNFT.clar**  
   - Purpose: Manages warranty tokens as non-fungible tokens (NFTs) using the SIP-009 trait. Each warranty is tied to a product serial number, expiration date, and owner (customer).  
   - Key Functions:  
     - `mint-warranty`: Mints a new NFT for a registered product.  
     - `transfer-warranty`: Transfers ownership (e.g., for resold products).  
     - `get-warranty-details`: Retrieves details like expiration and extension history.  
     - `extend-warranty`: Internal function to update expiration (called by automator).  
   - Solves: Tokenizes warranties for easy tracking and transferability.

2. **ComplaintRegistry.clar**  
   - Purpose: Handles filing and tracking complaints linked to warranties. Complaints include evidence URIs (IPFS hashes) and stakes (STX tokens) to deter spam.  
   - Key Functions:  
     - `file-complaint`: Registers a complaint with warranty ID, description, and stake.  
     - `get-complaint-status`: Returns status (open, resolved, rejected).  
     - `resolve-complaint`: Marks as resolved (called by resolvers).  
   - Solves: Provides a decentralized ledger for disputes, reducing reliance on centralized customer service.

3. **VirtualComplaintResolver.clar**  
   - Purpose: Automates resolution of virtual complaints using on-chain evidence review, such as multisig voting by appointed reviewers or AI-oracle integration.  
   - Key Functions:  
     - `submit-evidence`: Adds evidence to a complaint.  
     - `vote-on-resolution`: Allows reviewers to vote (e.g., yes/no on validity).  
     - `finalize-virtual-resolution`: Tallies votes and resolves if threshold met.  
     - Emits events for integration with the automator.  
   - Solves: Enables remote, digital-first resolutions for minor issues like software bugs.

4. **InspectionOracle.clar**  
   - Purpose: Verifies in-person inspections using external oracles (e.g., Chainlink-like on Stacks) or multisig attestations from inspectors. Stores verification proofs.  
   - Key Functions:  
     - `submit-inspection-report`: Oracle pushes report with proof (e.g., signed hash).  
     - `verify-inspection`: Confirms validity and links to complaint.  
     - `get-inspection-status`: Retrieves report details.  
   - Solves: Bridges off-chain physical inspections to on-chain automation, ensuring trust in hardware-related warranties.

5. **ExtensionAutomator.clar**  
   - Purpose: Core automation contract that listens for resolution events from resolvers and triggers warranty extensions based on rules (e.g., extend by 6 months if resolved positively).  
   - Key Functions:  
     - `trigger-extension`: Called automatically via events; checks conditions and calls WarrantyNFT to extend.  
     - `set-extension-rules`: Admin function to define rules (e.g., extension duration).  
     - Handles refunds/penalties from stakes.  
   - Solves: Automates the extension process, eliminating manual approvals.

6. **Governance.clar**  
   - Purpose: Manages system parameters, reviewer appointments, and upgrades using a DAO-like token voting system (e.g., with STX or custom tokens).  
   - Key Functions:  
     - `propose-change`: Submits proposals for rule changes.  
     - `vote-on-proposal`: Token holders vote.  
     - `execute-proposal`: Applies changes if passed.  
   - Solves: Ensures the system evolves without central control, adapting to new regulations or user needs.

## Prerequisites

- Stacks Wallet (e.g., Hiro Wallet) for deployment and interaction.
- Clarinet: The Clarity development toolkit for local testing.
- Node.js and Yarn for any frontend integrations (not included here).

## Installation

1. Clone the repository:

2. Install Clarinet:
   ```
   curl -L https://clarinet.stacks.co/install | sh
   ```

3. Initialize the project:
   ```
   clarinet new .
   ```

4. Add the contracts to the `contracts/` directory (copy the .clar files provided in this repo).

5. Configure `Clarinet.toml` for dependencies (e.g., SIP-009 for NFTs).

## Deployment

1. Test locally:
   ```
   clarinet test
   ```

2. Deploy to Stacks Testnet:
   - Use Clarinet to generate deployment plans.
   - Run:
     ```
     clarinet deploy --testnet
     ```

3. For Mainnet, update the deployment plan and use your wallet to broadcast transactions.

## Usage

1. **Register a Warranty**: Call `mint-warranty` on WarrantyNFT with product details.
2. **File a Complaint**: Use ComplaintRegistry to submit with stake.
3. **Resolve Virtually**: Submit evidence and vote via VirtualComplaintResolver.
4. **Resolve In-Person**: Oracle submits report to InspectionOracle.
5. **Auto-Extension**: ExtensionAutomator handles the rest; query WarrantyNFT for updated expiration.
6. **Govern**: Propose and vote on changes via Governance.

Interact via Stacks Explorer or build a dApp frontend (e.g., with React and @stacks/connect).

## Security Considerations

- All contracts use Clarity's safety features: no reentrancy, explicit error handling.
- Audits recommended before mainnet deployment.
- Stakes deter spam; oracles should be decentralized.

## Contributing

Fork the repo, add improvements (e.g., more traits), and submit PRs. Focus on Clarity best practices.

## License

MIT License. See LICENSE file for details.