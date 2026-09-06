package com.sponsormatch.dto;
import com.sponsormatch.entity.Role;
import jakarta.validation.constraints.*;
public final class AuthDtos { private AuthDtos(){} public record RegisterRequest(@NotBlank String name,@NotBlank @Email String email,@NotBlank @Size(min=8,max=100) String password,@NotNull Role role){} public record LoginRequest(@NotBlank @Email String email,@NotBlank String password){} public record AuthResponse(String token,Long userId,String name,String email,Role role){} }
