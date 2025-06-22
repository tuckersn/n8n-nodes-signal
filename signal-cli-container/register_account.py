#!/usr/bin/env python3
"""Signal-CLI Account Registration Script"""

import subprocess
import sys
import os
from time import sleep


def run_signal_command(args: list) -> subprocess.CompletedProcess:
    """Run a signal-cli command and return the result."""
    cmd = ["signal-cli"] + args
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    
    # Only show debug output for registration/verification failures
    if result.returncode != 0 and ("register" in args or "verify" in args):
        print(f"Command failed: {' '.join(cmd)}")
        print(f"Exit code: {result.returncode}")
        print(f"Stderr: {result.stderr}")
    
    return result


def is_account_registered(phone_number: str) -> bool:
    """Check if the account is already registered by looking for local data files."""
    print(f"Checking registration status for {phone_number}...")
    
    # signal-cli stores data in these locations (from GitHub docs)
    possible_data_dirs = [
        os.path.expanduser("~/.local/share/signal-cli/data"),
        os.path.expanduser("~/.config/signal-cli/data"),
        "/root/.local/share/signal-cli/data",
        "/root/.config/signal-cli/data"
    ]
    
    
    # Check for account data directory or files
    for data_dir in possible_data_dirs:
        # execute ls -la and print the output
        print(f"Listing directory: {data_dir}")
        result = subprocess.run(["ls", "-la", data_dir], capture_output=True, text=True)
        print(result.stdout)
        
        # Check for key files that indicate registration
        key_files = ["accounts.json", "identity", "profiles"]
        for f in key_files:
            print(f"Checking for file: {os.path.join(data_dir, f)}")
            if os.path.exists(os.path.join(data_dir, f)):
                print(f"Account data found - already registered! {f}")
                return True

    # Fallback: check if listAccounts works without hitting servers
    try:
        result = run_signal_command(["listAccounts"])
        if result.returncode == 0 and phone_number in result.stdout:
            print("✓ Account found in local accounts!")
            return True
    except:
        pass
    
    print("✗ No registration data found")
    return False


def register_account(phone_number: str) -> bool:
    """Register the signal-cli account."""
    print(f"Registering Signal account for {phone_number}...")
    

    
    print("CAPTCHA REQUIRED:")
    print("1. Go to: https://signalcaptchas.org/registration/generate.html")
    print("2. Solve the captcha and copy the signalcaptcha:// URL")
    captcha_url = input("Enter captcha URL: ").strip()
    
    # Register with captcha
    result = run_signal_command(["-u", phone_number, "register", "--captcha", captcha_url])
    if result.returncode == 0:
        print("Registration with captcha successful!")
        return True
    elif "Rate Limited" in result.stderr:
        print("Rate limited. Please wait before trying again.")
        return False
    else:
        print(f"Registration failed: {result.stderr}")
        return False



def verify_account(phone_number: str) -> bool:
    """Verify the signal-cli account."""
    print("Check your SMS for a verification code")
    code = input("Enter verification code: ").strip()
    
    result = run_signal_command(["-u", phone_number, "verify", code])
    if result.returncode == 0:
        print("Account verification successful!")
        return True
    else:
        print(f"Verification failed: {result.stderr}")
        return False


def main():
    """Main function."""
    phone_number = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PHONE_NUMBER")
    
    if not phone_number:
        print("Error: No phone number provided")
        sys.exit(1)
    
    print(f"Signal CLI registration for {phone_number}")
    
    # Check if already registered
    if is_account_registered(phone_number):
        print("Account already registered")
        return
    
    if not register_account(phone_number):
        sys.exit(1)
    
    # Verify account
    if not verify_account(phone_number):
        sys.exit(1)

    print("Registration completed successfully!")


if __name__ == "__main__":
    main()