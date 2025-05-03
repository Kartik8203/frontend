import { firebase } from "./firebaseConfig";
import Cookies from "js-cookie";

const COOKIE_CONFIG = {
  expires: 7,
  secure: true,
  sameSite: "Strict"
};

function setSessionCookie(session) {
  if (!session) {
    console.log("No session provided");
    return;
  }

  try {
    console.log("Session provided:", session);

    Cookies.set("access_token", session.access_token, COOKIE_CONFIG);
    Cookies.set("refresh_token", session.refresh_token, COOKIE_CONFIG);

    if (session.user && session.user.id) {
      Cookies.set("user_id", session.user.id, COOKIE_CONFIG);

      if (session.user.email) {
        Cookies.set("user_email", session.user.email, COOKIE_CONFIG);
      }
      if (session.user.displayName || session.user.name) {
        Cookies.set("user_name", session.user.displayName || session.user.name, COOKIE_CONFIG);
      }
      if (session.user.role) {
        Cookies.set("user_role", session.user.role, COOKIE_CONFIG);
      }
    }

    const cleanSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.displayName || session.user?.name,
        role: session.user?.role
      }
    };

    const sessionString = JSON.stringify(cleanSession, (key, value) => {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const seen = new Set();
        return Object.fromEntries(
          Object.entries(value).filter(([k, v]) => {
            if (seen.has(v)) return false;
            seen.add(v);
            return true;
          })
        );
      }
      return value;
    });

    if (sessionString) {
      Cookies.set("firebase_session", sessionString, COOKIE_CONFIG);
      console.log("Session cookie set successfully");
    }

  } catch (error) {
    console.error("Error in setSessionCookie:", error);
    console.log("Session keys:", Object.keys(session));
    if (session.user) {
      console.log("User keys:", Object.keys(session.user));
    }
  }
}

function clearSessionCookie() {
  const cookiesToClear = [
    "access_token",
    "refresh_token",
    "user_id",
    "user_email",
    "user_name",
    "user_role",
    "firebase_session"
  ];

  cookiesToClear.forEach(cookie => {
    Cookies.remove(cookie);
  });
}

export function getSessionFromCookie() {
  try {
    const sessionStr = Cookies.get("firebase_session");
    if (sessionStr) {
      return JSON.parse(sessionStr);
    }

    const accessToken = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");
    const userId = Cookies.get("user_id");
    const userEmail = Cookies.get("user_email");
    const userName = Cookies.get("user_name");
    const userRole = Cookies.get("user_role");

    if (accessToken && refreshToken && userId) {
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: userId,
          email: userEmail,
          name: userName,
          role: userRole
        }
      };
    }
  } catch (error) {
    console.error("Error getting session from cookie:", error);
  }

  return null;
}

export async function signUpWithEmail(email, password, name) {
  try {
    // Removed type validation to fix the error
    
    const auth = firebase.auth();
    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    
    // Update user profile with full name
    await user.updateProfile({
      displayName: name
    });
    
    // Create custom token and session data
    const idToken = await user.getIdToken();
    const refreshToken = user.refreshToken;
    
    const sessionData = {
      access_token: idToken,
      refresh_token: refreshToken,
      user: {
        id: user.uid,
        email: user.email,
        name: name || user.displayName,
        role: 'user'
      }
    };
    
    setSessionCookie(sessionData);
    
    return { 
      data: {
        user: {
          id: user.uid,
          email: user.email,
          displayName: name
        },
        session: sessionData
      }, 
      error: null 
    };
  } catch (err) {
    console.error("Unexpected Signup Error:", err);
    return { data: null, error: err };
  }
}

export async function signInWithEmail(email, password) {
  try {
    const auth = firebase.auth();
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    
    const idToken = await user.getIdToken();
    const refreshToken = user.refreshToken;
    
    const sessionData = {
      access_token: idToken,
      refresh_token: refreshToken,
      user: {
        id: user.uid,
        email: user.email,
        name: user.displayName,
        role: 'user'
      }
    };
    
    setSessionCookie(sessionData);
    
    return { 
      data: {
        user: {
          id: user.uid,
          email: user.email,
          displayName: user.displayName
        },
        session: sessionData
      }, 
      error: null 
    };
  } catch (error) {
    console.error("Sign-in error:", error);
    return { data: null, error };
  }
}

export async function signInWithGoogle() {
  try {
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Add return URL as state parameter
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl');
    if (returnUrl) {
      provider.setCustomParameters({
        state: returnUrl
      });
    }
    
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    
    const idToken = await user.getIdToken();
    const refreshToken = user.refreshToken;
    
    const sessionData = {
      access_token: idToken,
      refresh_token: refreshToken,
      user: {
        id: user.uid,
        email: user.email,
        name: user.displayName,
        role: 'user'
      }
    };
    
    setSessionCookie(sessionData);
    
    return { 
      data: {
        user: {
          id: user.uid,
          email: user.email,
          displayName: user.displayName
        },
        session: sessionData
      }, 
      error: null 
    };
  } catch (error) {
    console.error("Google sign-in error:", error);
    return { data: null, error };
  }
}

export async function signOut() {
  try {
    const auth = firebase.auth();
    await auth.signOut();
    
    clearSessionCookie();
    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });

    localStorage.clear();

    return { error: null };
  } catch (error) {
    console.error("Sign out error:", error);
    return { error };
  }
}

export async function resetPassword(email) {
  try {
    const auth = firebase.auth();
    await auth.sendPasswordResetEmail(email, {
      url: `${window.location.origin}/resetpassword`,
      handleCodeInApp: true
    });
    
    return { data: true, error: null };
  } catch (error) {
    console.error('Reset password error:', error);
    return {
      data: null,
      error: {
        message: error.message || 'Failed to send reset instructions'
      }
    };
  }
}

export async function getSession() {
  try {
    const auth = firebase.auth();
    const user = auth.currentUser;
    
    if (user) {
      const idToken = await user.getIdToken(true);
      const refreshToken = user.refreshToken;
      
      const sessionData = {
        access_token: idToken,
        refresh_token: refreshToken,
        user: {
          id: user.uid,
          email: user.email,
          name: user.displayName,
          role: 'user'
        }
      };
      
      setSessionCookie(sessionData);
      
      return { 
        session: sessionData, 
        error: null 
      };
    }
    
    return { session: null, error: null };
  } catch (error) {
    console.error("Get session error:", error);
    return { session: null, error };
  }
}

export async function getCurrentUser() {
  try {
    const auth = firebase.auth();
    const user = auth.currentUser;
    
    if (user) {
      // Get additional user data from Firestore if needed
      const db = firebase.firestore();
      const profileRef = db.collection('profiles').doc(user.uid);
      const profileSnapshot = await profileRef.get();
      
      let profileData = null;
      
      if (profileSnapshot.exists) {
        profileData = profileSnapshot.data();
      } else {
        // Create a new profile if none exists
        profileData = {
          id: user.uid,
          email: user.email,
          full_name: user.displayName || null,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await profileRef.set(profileData);
      }
      
      return { 
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profile_data: profileData || null
        },
        error: null 
      };
    }
    
    // If no current user, try to get from cookie as fallback
    const sessionData = getSessionFromCookie();
    if (sessionData && sessionData.user && sessionData.user.id) {
      // Return user data from session cookie
      return {
        user: {
          uid: sessionData.user.id,
          email: sessionData.user.email,
          displayName: sessionData.user.name,
          profile_data: {
            full_name: sessionData.user.name,
            role: sessionData.user.role || 'user'
          }
        },
        error: null
      };
    }
    
    return { user: null, error: null };
  } catch (error) {
    console.error("Error getting current user:", error);
    return { user: null, error };
  }
}

export async function updatePassword(newPassword, token) {
  try {
    if (!token) {
      throw new Error('No reset token provided');
    }

    const auth = firebase.auth();
    
    // Apply the action code to verify the password reset code
    await auth.verifyPasswordResetCode(token);
    
    // Change the password
    await auth.confirmPasswordReset(token, newPassword);
    
    return { data: true, error: null };
  } catch (error) {
    console.error('Password update error:', error);
    return {
      data: null,
      error: {
        message: error.message || 'Failed to update password'
      }
    };
  }
}

export function onAuthStateChange(callback) {
  const auth = firebase.auth();
  return auth.onAuthStateChanged((user) => {
    if (user) {
      user.getIdToken().then((idToken) => {
        const sessionData = {
          access_token: idToken,
          refresh_token: user.refreshToken,
          user: {
            id: user.uid,
            email: user.email,
            name: user.displayName,
            role: 'user'
          }
        };
        
        setSessionCookie(sessionData);
        callback('SIGNED_IN', sessionData);
      });
    } else {
      clearSessionCookie();
      callback('SIGNED_OUT', null);
    }
  });
}

export async function isAuthenticated() {
  const auth = firebase.auth();
  const user = auth.currentUser;
  const session = getSessionFromCookie();
  
  return { 
    isAuthenticated: !!user || !!session, 
    session: session || (user ? { user: { id: user.uid } } : null) 
  };
}

export async function refreshSession() {
  try {
    const auth = firebase.auth();
    const user = auth.currentUser;
    
    if (user) {
      // Force refresh the token
      const idToken = await user.getIdToken(true);
      const refreshToken = user.refreshToken;
      
      const sessionData = {
        access_token: idToken,
        refresh_token: refreshToken,
        user: {
          id: user.uid,
          email: user.email,
          name: user.displayName,
          role: 'user'
        }
      };
      
      setSessionCookie(sessionData);
      
      return { 
        data: {
          session: sessionData
        }, 
        error: null 
      };
    }
    
    return { data: null, error: new Error('No user is signed in') };
  } catch (error) {
    console.error("Refresh session error:", error);
    return { data: null, error };
  }
}