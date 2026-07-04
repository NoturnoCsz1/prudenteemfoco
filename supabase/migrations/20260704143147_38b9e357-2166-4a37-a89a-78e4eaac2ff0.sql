
CREATE OR REPLACE FUNCTION public.role_rank(_role public.member_role)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  select case _role
    when 'owner'    then 50
    when 'admin'    then 40
    when 'manager'  then 30
    when 'promoter' then 25
    when 'operator' then 20
    when 'viewer'   then 10
  end;
$$;
