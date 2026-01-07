# Medical AI Models & Infrastructure Research

This document outlines the research into Large Language Models (LLMs) and embedding models specifically tailored for medical use, focusing on accuracy, compliance, and data privacy.

## 1. Medical-Grade Large Language Models (LLMs)

These models are trained or fine-tuned on vast medical datasets (PubMed, clinical notes, EHRs) to ensure they understand medical terminology and context better than general-purpose models.

| Model | Provider | Training Data | Best Use Case | Pros | Cons |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Med-PaLM 2** | Google | Medical exams, PubMed, research papers | Clinical Q&A, diagnostic reasoning | State-of-the-art accuracy, medical exam passing | Closed source, enterprise-only access via Google Cloud |
| **BioGPT** | Microsoft | Large-scale PubMed | Text generation, biomedical NLP tasks | Strong performance on biomedical benchmarks | May struggle with very recent clinical nuances without fine-tuning |
| **ClinicalBERT** | MIT/Open Source | MIMIC-III (Clinical notes) | Clinical NLP, entity recognition from EHRs | Excellent understanding of EHR jargon and abbreviations | Smaller scale (BERT-based), limited reasoning capabilities |
| **BioLinkBERT** | Stanford | PubMed articles with citation links | Document summarization, knowledge graph mapping | Understands relationships between different medical papers | Better at retrieval than long-form generative reasoning |
| **MediTron** | EPFL (Llama-2 based) | PubMed, clinical guidelines, textbooks | Medical guideline interpretation | Open-source (Llama-2 weights), high-quality clinical reasoning | Requires significant compute for self-hosting |

### Recommendations for Apprie:
- **For Generation (Copilot):** Consider using **MediTron** or a fine-tuned **Llama-3** (on medical data) if self-hosting for maximum privacy. For ease of use with compliance, **Azure OpenAI** or **AWS Bedrock** (with HIPAA-BAA) using models like GPT-4o or Claude 3.5 Sonnet is standard.
- **For Document Summarization:** BioGPT or BioLinkBERT are excellent specialized choices.

---

## 2. Embedding Models for Medical RAG (Retrieval-Augmented Generation)

RAG depends on how well medical concepts are represented in a vector space. General-purpose embeddings (like OpenAI's `text-embedding-3-small`) often miss nuances in medical codes or specialized terminology.

| Model | Category | Key Feature |
| :--- | :--- | :--- |
| **BioBERT / PubMedBERT** | Domain-Specific | Trained exclusively on medical literature; superior for medical keyword/semantic search. |
| **G-BioEL** | Entity Linking | Designed for Bio-Entity Linking (mapping text to standardized codes like UMLS/ICD-10). |
| **SapBERT** | Contrastive Learning | Excellent at aligning synonyms (e.g., "heart attack" vs "myocardial infarction"). |
| **BGE (Large) - Fine-tuned** | Hybrid | General-purpose model fine-tuned on medical Q&A pairs (e.g., MS-MARCO Med). |

---

## 3. HIPAA-Compliant Infrastructure & Hosting

To meet SOC 2 and GDPR requirements while using AI, the provider must offer a Business Associate Agreement (BAA) and guarantee data isolation.

- **Azure OpenAI Service:** Enterprise-grade security, data does not train the model by default, full HIPAA compliance.
- **AWS Bedrock:** Access to Claude (Anthropic), Llama (Meta), and Titan (AWS). Offers HIPAA-compliant serverless AI infrastructure.
- **Google Vertex AI:** Access to Med-PaLM 2 and Gemini. Strong focus on medical-specific model variants.
- **Local/On-Premise (Private Cloud):** Running open-source models (MediTron, BioGPT) on private GPU clusters (using technologies like vLLM or Ollama) ensures data never leaves Apprie's perimeter.

---

## 4. Privacy-Preserving Techniques

- **Differential Privacy:** Adding "noise" to datasets so individual records cannot be identified during model training.
- **Federated Learning:** Training models on decentralized data (e.g., across multiple hospitals) without moving the raw data to a central server.
- **De-identification Layers:** Using tools like **Microsoft Presidio** or **Philter** to automatically scrub PII/PHI from documents *before* they are sent to the LLM.

---

## 5. Next Steps for Apprie Infrastructure
1. **Model Selection:** Benchmark Llama-3-Medical vs. GPT-4o on specific Apprie summarization tasks.
2. **Vector DB:** Select a HIPAA-compliant vector store (e.g., Pinecone with enterprise encryption or pgvector on a private RDS instance).
3. **Audit Readiness:** Begin mapping model data flows for SOC 2 Type II compliance documentation.
