import json

class ChatAgent:
    def __init__(self):
        self.current_intent = None
        self.collected_data = {}
        self.dialog_state = {}

        # Define intents and their corresponding questions
        self.intents = {
            "track_symptoms": {
                "questions": [
                    "What symptoms are you experiencing?",
                    "When did these symptoms start?",
                    "How severe are the symptoms on a scale of 1 to 10?",
                    "Have you taken any medication for these symptoms?",
                    "Is there anything that makes the symptoms better or worse?"
                ],
                "required_slots": ["symptoms_experienced", "start_date", "severity", "medication_taken", "triggers"]
            }
            # Add more intents here, e.g., "schedule_appointment", "get_health_tips"
        }

    def _detect_intent(self, message: str) -> str | None:
        """
        Simple keyword-based intent detection.
        In a real application, you'd use a more sophisticated NLU/NLP service.
        """
        message_lower = message.lower()
        if "symptom" in message_lower or "track" in message_lower and "symptom" in message_lower : # A more robust check
            return "track_symptoms"
        # Add more intent detection logic here
        return None

    def _get_next_question(self) -> str | None:
        """
        Gets the next question for the current intent based on what data is still needed.
        """
        if not self.current_intent or self.current_intent not in self.intents:
            return None

        intent_details = self.intents[self.current_intent]
        required_slots = intent_details["required_slots"]
        questions = intent_details["questions"]

        for i, slot in enumerate(required_slots):
            if slot not in self.collected_data:
                self.dialog_state["current_question_slot"] = slot
                if i < len(questions):
                    return questions[i]
                else:
                    # Fallback if somehow slots and questions are misaligned
                    return f"Could you please provide information about {slot.replace('_', ' ')}?"
        return None # All slots filled

    def _send_to_llm_for_learning(self, intent: str, data: dict):
        """
        Placeholder for sending collected data to the LLM.
        This needs to be implemented based on your LLM's API.
        """
        print(f"AGENT: Simulating sending data to LLM for intent '{intent}':")
        print(json.dumps(data, indent=2))
        # Example:
        # response = allam_sdk.learn(intent=intent, examples=[data])
        # if response.success:
        #     print("AGENT: LLM has learned successfully.")
        # else:
        #     print(f"AGENT: LLM learning failed: {response.error}")
        pass

    def _generate_symptom_summary(self) -> str:
        """
        Generates a human-readable summary of the collected symptom data for the current session.
        """
        if not self.collected_data or self.current_intent != "track_symptoms":
            return "No symptom data collected in this session to summarize."

        summary_parts = ["Okay, I've recorded the following for your symptoms:"]
        if "symptoms_experienced" in self.collected_data:
            summary_parts.append(f"- Symptoms: {self.collected_data['symptoms_experienced']}")
        if "start_date" in self.collected_data:
            summary_parts.append(f"- Started around: {self.collected_data['start_date']}")
        if "severity" in self.collected_data:
            summary_parts.append(f"- Severity: {self.collected_data['severity']}/10")
        if "medication_taken" in self.collected_data:
            summary_parts.append(f"- Medication: {self.collected_data['medication_taken']}")
        if "triggers" in self.collected_data:
            summary_parts.append(f"- Triggers/modifying factors: {self.collected_data['triggers']}")
        
        if len(summary_parts) == 1: # Only the initial title
            return "It seems we collected some data, but I can't form a full summary. Please ensure all questions were answered."

        return "\\n".join(summary_parts)

    def chat(self, user_message: str) -> str:
        """
        Main chat handler for the agent.
        """
        response = ""

        if not self.current_intent:
            # Try to detect intent from the first message
            detected_intent = self._detect_intent(user_message)
            if detected_intent:
                self.current_intent = detected_intent
                self.collected_data = {} # Reset data for the new intent
                self.dialog_state = {}   # Reset dialog state
                print(f"AGENT: Intent detected: {self.current_intent}")
                next_question = self._get_next_question()
                if next_question:
                    response = next_question
                else:
                    # This case should ideally not happen if intent has questions
                    response = "I understand you want to {self.current_intent.replace('_', ' ')}, but I don't know what to ask next."
            else:
                response = "I'm not sure how to help with that. Can you try rephrasing? Perhaps mention 'track symptoms'?"
        else:
            # We are in an ongoing dialog, collect data
            current_slot_to_fill = self.dialog_state.get("current_question_slot")
            if current_slot_to_fill:
                self.collected_data[current_slot_to_fill] = user_message
                print(f"AGENT: Collected data for {current_slot_to_fill}: {user_message}")
            else:
                # This should not happen if logic is correct
                print("AGENT: Warning - no current slot to fill, but in an ongoing dialog.")


            next_question = self._get_next_question()
            if next_question:
                response = next_question
            else:
                # All questions asked, send data to LLM
                if self.collected_data:
                     self._send_to_llm_for_learning(self.current_intent, self.collected_data)
                     symptom_summary = self._generate_symptom_summary()
                     response = f"{symptom_summary}\\n\\nThe LLM has been updated with this information."
                else:
                    response = "It seems we haven't collected any data. Let's start over."
                # Reset for next interaction
                self.current_intent = None
                self.collected_data = {}
                self.dialog_state = {}


        return response

if __name__ == '__main__':
    # Example Usage
    agent = ChatAgent()
    print("Chat Agent Initialized. Type 'quit' to exit.")
    print("Try saying: 'Track my symptoms'")

    while True:
        user_input = input("YOU: ")
        if user_input.lower() == 'quit':
            break
        agent_response = agent.chat(user_input)
        print(f"AGENT: {agent_response}") 