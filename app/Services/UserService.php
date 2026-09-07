<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

// Almacena avatar subido o descarga de unavatar.io basado en email
class UserService
{
    // Si hay archivo: guarda localmente; si no: descarga de unavatar.io, null si falla
    public static function storeOrFetchAvatar(User $user, ?UploadedFile $avatar): ?string
    {
        if ($avatar) {
            // Guardar con extensión correcta
            $filename = $user->id.'.'.$avatar->clientExtension();
            $avatar->storePubliclyAs('public/avatars', $filename);

            return "/storage/avatars/{$filename}";
        } else {
            $filepath = storage_path("app/public/avatars/{$user->id}.jpg");

            try {
                $response = Http::timeout(20)
                    ->sink($filepath)
                    ->get("https://unavatar.io/{$user->email}?fallback=false");

                if ($response->successful()) {
                    return "/storage/avatars/{$user->id}.jpg";
                } else {
                    File::delete($filepath);

                    return null;
                }
            } catch (\Exception $e) {
                return null;
            }
        }
    }
}