import { supabase } from './supabase';

export interface PlaybookGenerationResult {
  success: boolean;
  error?: string;
  playbook?: string;
  remainingPlaybooks?: number;
}

export async function savePlaybookGeneration(
  userId: string,
  prompt: string,
  generatedContent: string,
  generationType: string
): Promise<PlaybookGenerationResult> {
  try {
    const { data: canGenerate, error: checkError } = await supabase
      .rpc('can_generate_playbook', { p_user_id: userId });

    if (checkError) {
      console.error('Error checking generation limit:', checkError);
      return {
        success: false,
        error: 'Erreur lors de la vérification des limites',
      };
    }

    if (!canGenerate) {
      return {
        success: false,
        error: 'Limite de génération atteinte pour ce mois. Passez à Pro pour un accès illimité !',
      };
    }

    const { error: insertError } = await supabase
      .from('playbook_generations')
      .insert({
        user_id: userId,
        prompt,
        generated_content: generatedContent,
        generation_type: generationType,
      });

    if (insertError) {
      console.error('Error saving playbook:', insertError);
      return {
        success: false,
        error: 'Erreur lors de la sauvegarde du playbook',
      };
    }

    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('playbooks_generated_this_month')
      .eq('id', userId)
      .maybeSingle();

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        playbooks_generated_this_month: (currentProfile?.playbooks_generated_this_month || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('playbooks_generated_this_month, subscription_plan')
      .eq('id', userId)
      .maybeSingle();

    const remaining = profile?.subscription_plan === 'free'
      ? 3 - (profile?.playbooks_generated_this_month || 0)
      : null;

    return {
      success: true,
      playbook: generatedContent,
      remainingPlaybooks: remaining || undefined,
    };
  } catch (error) {
    console.error('Exception in savePlaybookGeneration:', error);
    return {
      success: false,
      error: 'Une erreur inattendue est survenue',
    };
  }
}

export async function getUserPlaybookHistory(userId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('playbook_generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching playbook history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getUserPlaybookHistory:', error);
    return [];
  }
}
