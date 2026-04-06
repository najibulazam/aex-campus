"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  addCourse,
  archiveCourse,
  deleteCourse,
  subscribeCourses,
  updateCourse,
} from "@/lib/courseService";
import type { Course, CourseInput, CourseStatus } from "@/types/course";

type CourseStatusFilter = "all" | CourseStatus;
type MutationResult = { ok: true } | { ok: false; message: string };

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function useCourses() {
  const { user } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeCourses(
      user.uid,
      (fetchedCourses) => {
        setCourses(fetchedCourses);
        setCoursesLoading(false);
        setCoursesError(null);
      },
      (error) => {
        console.error("[useCourses] Firestore listener error:", error);
        setCoursesError("Could not load courses. Please check your Firebase configuration.");
        setCoursesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddCourse = useCallback(
    async (input: Omit<CourseInput, "userId">) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await addCourse({
          userId: user.uid,
          ...input,
        });
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useCourses] Failed to add course:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to add course."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const handleUpdateCourse = useCallback(
    async (id: string, updates: Partial<Omit<CourseInput, "userId">>) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await updateCourse(id, user.uid, updates);
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useCourses] Failed to update course:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to update course."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const handleArchiveCourse = useCallback(
    async (id: string) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await archiveCourse(id, user.uid);
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useCourses] Failed to archive course:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to archive course."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const handleDeleteCourse = useCallback(
    async (id: string) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await deleteCourse(id, user.uid);
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useCourses] Failed to delete course:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to delete course."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const statusMatch = statusFilter === "all" || course.status === statusFilter;
      if (!statusMatch) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const source = `${course.name} ${course.code ?? ""} ${course.instructor ?? ""}`.toLowerCase();
      return source.includes(q);
    });
  }, [courses, searchQuery, statusFilter]);

  const courseCounts = useMemo(
    () => ({
      all: courses.length,
      active: courses.filter((course) => course.status === "active").length,
      archived: courses.filter((course) => course.status === "archived").length,
      completed: courses.filter((course) => course.status === "completed").length,
    }),
    [courses]
  );

  return {
    user,
    courses,
    filteredCourses,
    coursesLoading,
    coursesError,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    courseCounts,
    handleAddCourse,
    handleUpdateCourse,
    handleArchiveCourse,
    handleDeleteCourse,
  };
}
