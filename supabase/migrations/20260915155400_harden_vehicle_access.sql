begin;

-- ============================================================
-- VEHICLES TABLE RLS
-- ============================================================

alter table public.vehicles enable row level security;


-- ============================================================
-- ADMIN-ONLY DIRECT VEHICLE TABLE ACCESS
-- ============================================================

drop policy if exists "Admins have full access to vehicles"
on public.vehicles;

create policy "Admins have full access to vehicles"
on public.vehicles
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- ============================================================
-- REMOVE LEGACY / BROAD VEHICLE POLICIES
-- ============================================================

drop policy if exists "Internal tracker read vehicles"
on public.vehicles;

drop policy if exists "Internal tracker update vehicles"
on public.vehicles;

drop policy if exists "vehicles_insert_anon"
on public.vehicles;

drop policy if exists "vehicles_insert_authenticated"
on public.vehicles;

drop policy if exists "vehicles_select_anon"
on public.vehicles;

drop policy if exists "vehicles_select_authenticated"
on public.vehicles;

drop policy if exists "vehicles_update_anon"
on public.vehicles;

drop policy if exists "vehicles_update_authenticated"
on public.vehicles;


-- ============================================================
-- 1. AVAILABLE VEHICLE CATALOGUE
-- ============================================================

create or replace function public.list_available_vehicles_for_employee(
  p_employee_number text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_number text;
  v_result jsonb;
begin
  /*
   * ------------------------------------------------
   * ACTOR CHECK
   * ------------------------------------------------
   *
   * Authenticated users must be admins.
   * Anonymous users must provide an active employee
   * number from the vehicle driver register.
   */

  if auth.uid() is not null then

    if not public.is_admin() then
      raise exception 'Unauthorized.';
    end if;

  else

    v_employee_number :=
      upper(trim(coalesce(p_employee_number, '')));

    if v_employee_number = '' then
      raise exception 'Employee number is required.';
    end if;

    if not exists (
      select 1
      from public.drivers d
      where upper(trim(d.employee_number)) =
        v_employee_number
        and d.active = true
    ) then
      raise exception 'Unauthorized.';
    end if;

  end if;


  /*
   * ------------------------------------------------
   * VEHICLE CATALOGUE
   * ------------------------------------------------
   *
   * Match the EmployeeRequestVehicle behaviour:
   * active + roadworthy vehicles are returned.
   *
   * Status is included because the frontend decides
   * whether a vehicle is AVAILABLE.
   */

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'make', v.make,
          'model', v.model,
          'registration', v.registration,
          'registration_number', v.registration_number,
          'current_odometer', v.current_odometer,
          'status', v.status,
          'roadworthy', v.roadworthy,
          'active', v.active,
          'default_parking', v.default_parking
        )
        order by
          v.make,
          v.model,
          v.registration
      ),
      '[]'::jsonb
    )
  into v_result
  from public.vehicles v
  where v.active = true
    and v.roadworthy = true;

  return v_result;
end;
$$;


-- ============================================================
-- 2. VEHICLES RELATED TO ONE EMPLOYEE
-- ============================================================

create or replace function public.list_vehicles_for_employee(
  p_employee_number text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_number text;
  v_result jsonb;
begin
  /*
   * ------------------------------------------------
   * NORMALIZE EMPLOYEE NUMBER
   * ------------------------------------------------
   *
   * This happens before the actor check so an
   * authenticated admin browser session can still use
   * the supplied employee context.
   */

  v_employee_number :=
    upper(trim(coalesce(p_employee_number, '')));

  if v_employee_number = '' then
    raise exception 'Employee number is required.';
  end if;


  /*
   * ------------------------------------------------
   * ACTOR CHECK
   * ------------------------------------------------
   */

  if auth.uid() is not null then

    if not public.is_admin() then
      raise exception 'Unauthorized.';
    end if;

  else

    if not exists (
      select 1
      from public.drivers d
      where upper(trim(d.employee_number)) =
        v_employee_number
        and d.active = true
    ) then
      raise exception 'Unauthorized.';
    end if;

  end if;


  /*
   * ------------------------------------------------
   * EMPLOYEE-RELATED VEHICLES
   * ------------------------------------------------
   *
   * Return only vehicles connected to this employee
   * through a vehicle request or a vehicle trip.
   */

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'make', v.make,
          'model', v.model,
          'registration', v.registration,
          'registration_number', v.registration_number,
          'current_odometer', v.current_odometer,
          'status', v.status,
          'roadworthy', v.roadworthy,
          'active', v.active,
          'default_parking', v.default_parking
        )
        order by
          v.make,
          v.model,
          v.registration
      ),
      '[]'::jsonb
    )
  into v_result
  from public.vehicles v
  where
    exists (
      select 1
      from public.vehicle_requests r
      where r.vehicle_id = v.id
        and upper(trim(r.employee_number)) =
          v_employee_number
    )
    or
    exists (
      select 1
      from public.vehicle_trips t
      where t.vehicle_id = v.id
        and upper(trim(t.employee_number)) =
          v_employee_number
    );

  return v_result;
end;
$$;


-- ============================================================
-- 3. VEHICLE LOOKUP BOUND TO REQUEST OR TRIP CONTEXT
-- ============================================================

create or replace function public.get_vehicle_for_employee_context(
  p_vehicle_id uuid,
  p_employee_number text,
  p_request_id uuid default null,
  p_trip_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_number text;
  v_authorized boolean := false;
  v_result jsonb;
begin
  v_employee_number :=
    upper(trim(coalesce(p_employee_number, '')));


  /*
   * ------------------------------------------------
   * ACTOR CHECK
   * ------------------------------------------------
   */

  if auth.uid() is not null then

    if not public.is_admin() then
      raise exception 'Unauthorized.';
    end if;

    /*
     * Authenticated admins may read the requested
     * restricted vehicle record.
     */

    v_authorized := true;

  else

    if v_employee_number = '' then
      raise exception 'Employee number is required.';
    end if;

    if not exists (
      select 1
      from public.drivers d
      where upper(trim(d.employee_number)) =
        v_employee_number
        and d.active = true
    ) then
      raise exception 'Unauthorized.';
    end if;


    /*
     * ------------------------------------------------
     * REQUEST OWNERSHIP
     * ------------------------------------------------
     */

    if p_request_id is not null then

      if exists (
        select 1
        from public.vehicle_requests r
        where r.id = p_request_id
          and r.vehicle_id = p_vehicle_id
          and upper(trim(r.employee_number)) =
            v_employee_number
      ) then
        v_authorized := true;
      end if;

    end if;


    /*
     * ------------------------------------------------
     * TRIP OWNERSHIP
     * ------------------------------------------------
     */

    if not v_authorized
      and p_trip_id is not null then

      if exists (
        select 1
        from public.vehicle_trips t
        where t.id = p_trip_id
          and t.vehicle_id = p_vehicle_id
          and upper(trim(t.employee_number)) =
            v_employee_number
      ) then
        v_authorized := true;
      end if;

    end if;


    /*
     * An active employee cannot use this RPC to fetch
     * an arbitrary unrelated vehicle.
     */

    if not v_authorized then
      return null;
    end if;

  end if;


  /*
   * ------------------------------------------------
   * SAFE VEHICLE RECORD
   * ------------------------------------------------
   */

  select
    jsonb_build_object(
      'id', v.id,
      'make', v.make,
      'model', v.model,
      'registration', v.registration,
      'registration_number', v.registration_number,
      'current_odometer', v.current_odometer,
      'status', v.status,
      'roadworthy', v.roadworthy,
      'active', v.active,
      'default_parking', v.default_parking
    )
  into v_result
  from public.vehicles v
  where v.id = p_vehicle_id;

  return v_result;
end;
$$;


-- ============================================================
-- 4. REQUEST-TIME VEHICLE STATE CHECK
-- ============================================================

create or replace function public.check_vehicle_requestability_for_employee(
  p_vehicle_id uuid,
  p_employee_number text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_number text;
  v_result jsonb;
begin
  /*
   * ------------------------------------------------
   * ACTOR CHECK
   * ------------------------------------------------
   */

  if auth.uid() is not null then

    if not public.is_admin() then
      raise exception 'Unauthorized.';
    end if;

  else

    v_employee_number :=
      upper(trim(coalesce(p_employee_number, '')));

    if v_employee_number = '' then
      raise exception 'Employee number is required.';
    end if;

    if not exists (
      select 1
      from public.drivers d
      where upper(trim(d.employee_number)) =
        v_employee_number
        and d.active = true
    ) then
      raise exception 'Unauthorized.';
    end if;

  end if;


  /*
   * ------------------------------------------------
   * REQUESTABILITY STATE ONLY
   * ------------------------------------------------
   *
   * The employee request form only needs to know
   * whether the selected vehicle can still be
   * requested at submission time.
   */

  select
    jsonb_build_object(
      'id', v.id,
      'active', v.active,
      'roadworthy', v.roadworthy,
      'status', v.status
    )
  into v_result
  from public.vehicles v
  where v.id = p_vehicle_id;

  return v_result;
end;
$$;


-- ============================================================
-- RPC EXECUTION PERMISSIONS
-- ============================================================

revoke all
on function public.list_available_vehicles_for_employee(text)
from public;

revoke all
on function public.list_vehicles_for_employee(text)
from public;

revoke all
on function public.get_vehicle_for_employee_context(
  uuid,
  text,
  uuid,
  uuid
)
from public;

revoke all
on function public.check_vehicle_requestability_for_employee(
  uuid,
  text
)
from public;


grant execute
on function public.list_available_vehicles_for_employee(text)
to anon, authenticated;

grant execute
on function public.list_vehicles_for_employee(text)
to anon, authenticated;

grant execute
on function public.get_vehicle_for_employee_context(
  uuid,
  text,
  uuid,
  uuid
)
to anon, authenticated;

grant execute
on function public.check_vehicle_requestability_for_employee(
  uuid,
  text
)
to anon, authenticated;


commit;
