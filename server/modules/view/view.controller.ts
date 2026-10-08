import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class ViewController {

  @Get(['/', '*'])
  @Render('index')
  async render(): Promise<{ __platform__: string }> {
    return {
      __platform__: JSON.stringify({}),
    };
  }
}
