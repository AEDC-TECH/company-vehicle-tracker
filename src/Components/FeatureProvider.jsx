import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import {
  DEFAULT_FEATURES,
  FEATURE_DEFINITIONS,
} from "../config/features";

import "../Styles/FeatureVisibility.css";


const FeatureContext =
  createContext(null);


function applyFeatureAttributes(
  featureMap
) {
  const root =
    document.documentElement;

  FEATURE_DEFINITIONS.forEach(
    ({ key }) => {
      root.setAttribute(
        `data-feature-${key.replaceAll(
          "_",
          "-"
        )}`,
        featureMap[key]
          ? "on"
          : "off"
      );
    }
  );
}


export function FeatureProvider({
  children,
}) {
  const [
    features,
    setFeatures,
  ] =
    useState(
      DEFAULT_FEATURES
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState("");


  const refreshFeatures =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setLoadError("");

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "system_features"
              )
              .select(
                "feature_key, enabled, updated_at, updated_by"
              );

          if (error) {
            throw error;
          }

          const next = {
            ...DEFAULT_FEATURES,
          };

          (
            data || []
          ).forEach(
            (row) => {
              if (
                Object.prototype
                  .hasOwnProperty
                  .call(
                    next,
                    row.feature_key
                  )
              ) {
                next[
                  row.feature_key
                ] =
                  Boolean(
                    row.enabled
                  );
              }
            }
          );

          setFeatures(
            next
          );

          applyFeatureAttributes(
            next
          );
        } catch (error) {
          console.error(
            "Feature settings load error:",
            error
          );

          /*
           * FAIL OPEN:
           * If feature settings fail to load,
           * keep the existing system available.
           */
          setFeatures(
            DEFAULT_FEATURES
          );

          applyFeatureAttributes(
            DEFAULT_FEATURES
          );

          setLoadError(
            error.message ||
              "Unable to load system feature settings."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );


  useEffect(() => {
    applyFeatureAttributes(
      DEFAULT_FEATURES
    );

    refreshFeatures();
  }, [refreshFeatures]);


  const isEnabled =
    useCallback(
      (featureKey) =>
        features[
          featureKey
        ] !== false,
      [features]
    );


  const areEnabled =
    useCallback(
      (
        featureKeys = []
      ) =>
        featureKeys.every(
          (featureKey) =>
            isEnabled(
              featureKey
            )
        ),
      [isEnabled]
    );


  const value =
    useMemo(
      () => ({
        features,
        loading,
        loadError,
        isEnabled,
        areEnabled,
        refreshFeatures,
      }),
      [
        features,
        loading,
        loadError,
        isEnabled,
        areEnabled,
        refreshFeatures,
      ]
    );


  return (
    <FeatureContext.Provider
      value={value}
    >
      {children}
    </FeatureContext.Provider>
  );
}


export function useFeatures() {
  const context =
    useContext(
      FeatureContext
    );

  if (!context) {
    throw new Error(
      "useFeatures must be used inside FeatureProvider."
    );
  }

  return context;
}


export function useFeature(
  featureKey
) {
  const {
    isEnabled,
    loading,
  } =
    useFeatures();

  return {
    enabled:
      isEnabled(
        featureKey
      ),

    loading,
  };
}