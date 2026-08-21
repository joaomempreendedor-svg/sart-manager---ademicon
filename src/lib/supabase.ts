import { supabase } from '@/integrations/supabase/client';

export async function getAllFromTable(
  table: string, 
  options: { 
    filters?: Record<string, any>;
    orderBy?: string; 
    ascending?: boolean;
    select?: string;
  } = {}
) {
  const { filters = {}, orderBy, ascending = true, select = '*' } = options;
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .match(filters)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      throw error;
    }

    if (!data?.length) break;
    allData = [...allData, ...data];
    page++;
  }
  // To maintain compatibility with Promise.all structure that expects { data, error }
  return { data: allData, error: null };
}