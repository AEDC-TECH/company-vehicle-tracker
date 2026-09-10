import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  FaShieldAlt,
  FaSpinner,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";


function ProtectedAdminRoute() {
  const location = useLocation();

  const [checking, setChecking] =
    useState(true);

  const [authorised, setAuthorised] =
    useState(false);


  useEffect(() => {
    let mounted = true;


    async function verifyAdmin() {
      try {
        const {
          data: {
            session,
          },
          error: sessionError,
        } =
          await supabase.auth.getSession();


        if (sessionError) {
          console.error(
            "Session check failed:",
            sessionError
          );

          if (mounted) {
            setAuthorised(false);
          }

          return;
        }


        if (!session?.user) {
          if (mounted) {
            setAuthorised(false);
          }

          return;
        }


        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("user_profiles")
            .select("role")
            .eq(
              "id",
              session.user.id
            )
            .maybeSingle();


        if (profileError) {
          console.error(
            "Admin role check failed:",
            profileError
          );

          if (mounted) {
            setAuthorised(false);
          }

          return;
        }


        if (mounted) {
          setAuthorised(
            profile?.role === "admin"
          );
        }
      } catch (error) {
        console.error(
          "Admin verification failed:",
          error
        );

        if (mounted) {
          setAuthorised(false);
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }


    verifyAdmin();


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          verifyAdmin();
        }
      );


    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);


  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #090b44, #11145f)",
          color: "#ffffff",
          fontFamily:
            "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "330px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            padding: "34px",
            textAlign: "center",
          }}
        >
          <FaSpinner
            style={{
              fontSize: "1.35rem",
            }}
          />

          <strong
            style={{
              fontSize: "0.78rem",
            }}
          >
            Verifying admin access
          </strong>

          <span
            style={{
              fontSize: "0.62rem",
              opacity: 0.68,
            }}
          >
            Secure session check in progress...
          </span>
        </div>
      </main>
    );
  }


  if (!authorised) {
    return (
      <Navigate
        to="/admin-login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }


  return <Outlet />;
}


export default ProtectedAdminRoute;
