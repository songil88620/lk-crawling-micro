import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';

@Controller('proxies')
export class ProxiesController {
  constructor(private readonly proxiesService: ProxiesService) {}

  
}
