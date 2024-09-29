import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';


export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    const pdfRecord = await uploadPdf(supabase, file, user.id);

    return NextResponse.json({ pdf: pdfRecord });
  } catch (error) {
    console.error('Error in PDF upload:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}