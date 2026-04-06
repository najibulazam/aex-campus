"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  addStudyGroup,
  deleteStudyGroup,
  subscribeGroups,
  updateStudyGroup,
} from "@/lib/groupService";
import type {
  StudyGroup,
  StudyGroupInput,
  StudyGroupStatus,
} from "@/types/studyGroup";

type GroupStatusFilter = "all" | StudyGroupStatus;
type MutationResult = { ok: true } | { ok: false; message: string };

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function useGroups() {
  const { user } = useAuth();

  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<GroupStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeGroups(
      user.uid,
      (fetchedGroups) => {
        setGroups(fetchedGroups);
        setGroupsLoading(false);
        setGroupsError(null);
      },
      (error) => {
        console.error("[useGroups] Firestore listener error:", error);
        setGroupsError("Could not load study groups. Please check your Firebase configuration.");
        setGroupsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddGroup = useCallback(
    async (input: Omit<StudyGroupInput, "ownerId">) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await addStudyGroup({
          ownerId: user.uid,
          ...input,
        });
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useGroups] Failed to add group:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to add study group."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const handleUpdateGroup = useCallback(
    async (id: string, updates: Partial<Omit<StudyGroupInput, "ownerId">>) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await updateStudyGroup(id, user.uid, updates);
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useGroups] Failed to update group:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to update study group."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const handleDeleteGroup = useCallback(
    async (id: string) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await deleteStudyGroup(id, user.uid);
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useGroups] Failed to delete group:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to delete study group."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const statusMatch = statusFilter === "all" || group.status === statusFilter;
      if (!statusMatch) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const source = `${group.name} ${group.subject}`.toLowerCase();
      return source.includes(q);
    });
  }, [groups, searchQuery, statusFilter]);

  const groupCounts = useMemo(
    () => ({
      all: groups.length,
      active: groups.filter((group) => group.status === "active").length,
      archived: groups.filter((group) => group.status === "archived").length,
    }),
    [groups]
  );

  return {
    user,
    groups,
    filteredGroups,
    groupsLoading,
    groupsError,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    groupCounts,
    handleAddGroup,
    handleUpdateGroup,
    handleDeleteGroup,
  };
}
