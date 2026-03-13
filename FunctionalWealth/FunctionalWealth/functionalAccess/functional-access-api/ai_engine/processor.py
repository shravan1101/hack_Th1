import mediapipe as mp
import numpy as np
import cv2
import base64
import time

class SignLanguageProcessor:
    def __init__(self):
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # In a real scenario, load the trained .tflite or sklearn model here.
        # e.g.: self.model = load_model('sign_language_model.tflite')
        
        # Stubbing the WLASL dataset labels for demo purposes
        self.labels = ['Hello', 'Thank You', 'Yes', 'No', 'I Love You', 'Please', 'Help']
        self.frame_counter = 0
        self.last_prediction_time = time.time()

    def process_frame(self, base64_string):
        """
        Takes a base64 encoded jpeg frame and returns a predicted sign string, 
        simulating a real ML inference pipeline that processes skeletons.
        """
        try:
            # Decode base64 to image
            encoded_data = base64_string.split(',')[1] if ',' in base64_string else base64_string
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                return None, 0.0

            # Convert BGR to RGB for MediaPipe
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image.flags.writeable = False
            
            # Make mediapipe prediction to extract the skeleton
            results = self.holistic.process(image)
            
            # Extract landmarks and simulate passing to .tflite model
            if results.right_hand_landmarks or results.left_hand_landmarks:
                current_time = time.time()
                
                # Only "predict" a new word every 3 seconds to avoid spamming the UI
                if current_time - self.last_prediction_time > 3.0:
                    self.frame_counter += 1
                    mock_prediction = self.labels[self.frame_counter % len(self.labels)]
                    self.last_prediction_time = current_time
                    
                    # 0.85 to 0.99 simulated confidence
                    confidence = 0.85 + (np.random.random() * 0.14)
                    return mock_prediction, round(confidence, 2)
            
            return None, 0.0

        except Exception as e:
            print(f"Error processing frame: {e}")
            return None, 0.0

    def cleanup(self):
        self.holistic.close()
