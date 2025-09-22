import { useState } from "react";
import { PasswordInput } from "./PasswordInput";

interface PinConfirmInputProps {
  onPinConfirmed: (pin: string) => void;
  disabled?: boolean;
  label?: string;
}

// PIN validation function (same rules as usePinInput)
function validatePinStrength(pin: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (pin.length <= 8) {
    errors.push("PIN must be longer than 8 characters");
  }

  if (!/[0-9]/.test(pin)) {
    errors.push("PIN must contain at least one number");
  }

  if (!/[a-z]/.test(pin)) {
    errors.push("PIN must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(pin)) {
    errors.push("PIN must contain at least one uppercase letter");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function PinConfirmInput({ 
  onPinConfirmed, 
  disabled = false, 
  label = "Wallet PIN (Password)" 
}: PinConfirmInputProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinValidationErrors, setPinValidationErrors] = useState<string[]>([]);
  const [confirmError, setConfirmError] = useState("");
  const [showConfirmField, setShowConfirmField] = useState(false);

  const handlePinChange = (value: string) => {
    setPin(value);
    
    // Clear previous errors
    setPinValidationErrors([]);
    setConfirmError("");
    
    // Validate PIN strength
    if (value) {
      const validation = validatePinStrength(value);
      if (!validation.isValid) {
        setPinValidationErrors(validation.errors);
      } else {
        // PIN is valid, show confirm field
        setShowConfirmField(true);
      }
    } else {
      setShowConfirmField(false);
    }
    
    // Reset confirm PIN if main PIN changes
    setConfirmPin("");
  };

  const handleConfirmPinChange = (value: string) => {
    setConfirmPin(value);
    
    // Clear confirm error when user starts typing
    if (confirmError) {
      setConfirmError("");
    }
    
    // Check if PINs match when confirm field is filled
    if (value && pin !== value) {
      setConfirmError("PINs do not match");
    } else if (value && pin === value) {
      setConfirmError("");
      // Both PINs are valid and match, call the callback
      onPinConfirmed(pin);
    }
  };

  const isPinValid = pin && validatePinStrength(pin).isValid;
  const doPinsMatch = pin && confirmPin && pin === confirmPin;

  return (
    <div className="space-y-4">
      <div>
        <PasswordInput
          label={label + " *"}
          value={pin}
          onChange={handlePinChange}
          disabled={disabled}
          placeholder="Enter wallet PIN"
          autoComplete="new-password"
        />
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            PIN must be longer than 8 characters and contain uppercase letters, lowercase letters, and numbers
          </p>
          {pinValidationErrors.length > 0 && (
            <div className="mt-1 text-red-600 text-xs">
              {pinValidationErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConfirmField && isPinValid && (
        <div>
          <PasswordInput
            label="Confirm Wallet PIN *"
            value={confirmPin}
            onChange={handleConfirmPinChange}
            disabled={disabled}
            placeholder="Confirm wallet PIN"
            autoComplete="new-password"
          />
          {confirmError && (
            <div className="mt-1 text-red-600 text-xs">
              • {confirmError}
            </div>
          )}
          {doPinsMatch && (
            <div className="mt-1 text-green-600 text-xs">
              ✓ PINs match
            </div>
          )}
        </div>
      )}
    </div>
  );
}